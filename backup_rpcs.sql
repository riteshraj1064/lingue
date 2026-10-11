-- AUTO-GENERATED RPC METADATA

CREATE OR REPLACE FUNCTION public.admin_get_delete_dependencies(p_entity_type text, p_entity_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('content');
  if p_entity_type='course' then
    return jsonb_build_object('entity_type','course','entity_id',p_entity_id,
      'units',(select count(*) from public.units where course_id=p_entity_id),
      'lessons',(select count(*) from public.lessons l join public.units u on u.id=l.unit_id where u.course_id=p_entity_id),
      'questions',(select count(*) from public.questions q join public.lessons l on l.id=q.lesson_id join public.units u on u.id=l.unit_id where u.course_id=p_entity_id),
      'lesson_attempts',(select count(*) from public.lesson_attempts a join public.lessons l on l.id=a.lesson_id join public.units u on u.id=l.unit_id where u.course_id=p_entity_id),
      'question_attempts',(select count(*) from public.question_attempts a join public.questions q on q.id=a.question_id join public.lessons l on l.id=q.lesson_id join public.units u on u.id=l.unit_id where u.course_id=p_entity_id));
  elsif p_entity_type='unit' then
    return jsonb_build_object('entity_type','unit','entity_id',p_entity_id,
      'lessons',(select count(*) from public.lessons where unit_id=p_entity_id),
      'questions',(select count(*) from public.questions q join public.lessons l on l.id=q.lesson_id where l.unit_id=p_entity_id),
      'lesson_attempts',(select count(*) from public.lesson_attempts a join public.lessons l on l.id=a.lesson_id where l.unit_id=p_entity_id),
      'question_attempts',(select count(*) from public.question_attempts a join public.questions q on q.id=a.question_id join public.lessons l on l.id=q.lesson_id where l.unit_id=p_entity_id));
  elsif p_entity_type='lesson' then
    return jsonb_build_object('entity_type','lesson','entity_id',p_entity_id,
      'questions',(select count(*) from public.questions where lesson_id=p_entity_id),
      'lesson_attempts',(select count(*) from public.lesson_attempts where lesson_id=p_entity_id),
      'question_attempts',(select count(*) from public.question_attempts a join public.questions q on q.id=a.question_id where q.lesson_id=p_entity_id),
      'progress_rows',(select count(*) from public.user_lesson_progress where lesson_id=p_entity_id));
  elsif p_entity_type='question' then
    return jsonb_build_object('entity_type','question','entity_id',p_entity_id,
      'options',(select count(*) from public.question_options where question_id=p_entity_id),
      'question_attempts',(select count(*) from public.question_attempts where question_id=p_entity_id),
      'question_progress_rows',(select count(*) from public.user_question_progress where question_id=p_entity_id),
      'xp_transactions',(select count(*) from public.xp_transactions where question_id=p_entity_id),
      'heart_transactions',(select count(*) from public.heart_transactions where question_id=p_entity_id),
      'mistake_rows',(select count(*) from public.user_mistakes where question_id=p_entity_id));
  else raise exception 'INVALID_ENTITY_TYPE'; end if;
end; $function$


CREATE OR REPLACE FUNCTION public.grant_xp(p_user_id uuid, p_amount integer, p_type public.transaction_type, p_source_key text, p_question_id bigint DEFAULT NULL::bigint, p_lesson_id bigint DEFAULT NULL::bigint, p_question_attempt_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_base_xp integer;
  v_awarded_xp integer;

  v_multiplier numeric := 1;
  v_boost_until timestamptz;

  v_existing public.xp_transactions%rowtype;
  v_transaction_id uuid;

  v_total_xp bigint;
begin

  -- ============================================================
  -- 1. Validate user
  -- ============================================================

  if p_user_id is null then
    raise exception 'USER_REQUIRED';
  end if;


  -- ============================================================
  -- 2. Validate XP
  -- ============================================================

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_XP_AMOUNT';
  end if;


  -- ============================================================
  -- 3. Validate source key
  -- ============================================================

  if p_source_key is null
     or btrim(p_source_key) = '' then
    raise exception 'SOURCE_KEY_REQUIRED';
  end if;


  -- ============================================================
  -- 4. Lock user stats
  -- ============================================================

  perform 1
  from public.user_stats
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'USER_STATS_NOT_FOUND';
  end if;


  -- ============================================================
  -- 5. Idempotency check
  -- ============================================================

  select *
  into v_existing
  from public.xp_transactions
  where user_id = p_user_id
    and source_key = p_source_key
  order by created_at desc
  limit 1;

  if found then

    select total_xp
    into v_total_xp
    from public.user_stats
    where user_id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'already_granted', true,
      'transaction_id', v_existing.id,

      'base_xp',
        coalesce(
          (v_existing.metadata->>'base_xp')::integer,
          v_existing.amount
        ),

      'awarded_xp',
        v_existing.amount,

      'multiplier',
        coalesce(
          (v_existing.metadata->>'multiplier')::numeric,
          1
        ),

      'total_xp',
        v_total_xp
    );

  end if;


  -- ============================================================
  -- 6. Base XP
  -- ============================================================

  v_base_xp := p_amount;


  -- ============================================================
  -- 7. Read XP boost
  -- ============================================================

  select
    xp_boost_until,
    coalesce(xp_boost_multiplier, 1)
  into
    v_boost_until,
    v_multiplier
  from public.user_stats
  where user_id = p_user_id;


  -- ============================================================
  -- 8. Apply XP boost
  --
  -- Boost applies ONLY to:
  -- QUESTION_XP
  -- LESSON_COMPLETION
  --
  -- BONUS and CORRECTION are not boosted.
  -- ============================================================

  if p_type in (
    'QUESTION_XP'::public.transaction_type,
    'LESSON_COMPLETION'::public.transaction_type
  )
  and v_boost_until is not null
  and v_boost_until > clock_timestamp()
  and v_multiplier > 1 then

    v_awarded_xp :=
      greatest(
        1,
        round(v_base_xp * v_multiplier)::integer
      );

  else

    v_multiplier := 1;
    v_awarded_xp := v_base_xp;

  end if;


  -- ============================================================
  -- 9. Reset expired boost
  -- ============================================================

  if v_boost_until is not null
     and v_boost_until <= clock_timestamp() then

    update public.user_stats
    set
      xp_boost_until = null,
      xp_boost_multiplier = 1,
      updated_at = now()
    where user_id = p_user_id;

    v_boost_until := null;
  end if;


  -- ============================================================
  -- 10. UPDATE TOTAL XP
  --
  -- THIS IS THE IMPORTANT PART.
  -- ============================================================

  update public.user_stats
  set
    total_xp = total_xp + v_awarded_xp,
    updated_at = now()
  where user_id = p_user_id
  returning total_xp
  into v_total_xp;


  -- ============================================================
  -- 11. Insert XP transaction
  -- ============================================================

  insert into public.xp_transactions (
    user_id,
    amount,
    type,
    question_id,
    lesson_id,
    question_attempt_id,
    source_key,
    description,
    metadata
  )
  values (
    p_user_id,
    v_awarded_xp,
    p_type,
    p_question_id,
    p_lesson_id,
    p_question_attempt_id,
    p_source_key,
    p_description,

    coalesce(p_metadata, '{}'::jsonb)
    ||
    jsonb_build_object(
      'base_xp', v_base_xp,
      'multiplier', v_multiplier,
      'awarded_xp', v_awarded_xp,

      'boost_active',
        (
          v_multiplier > 1
          and v_boost_until is not null
          and v_boost_until > clock_timestamp()
        ),

      'boost_until', v_boost_until
    )
  )
  returning id
  into v_transaction_id;


  -- ============================================================
  -- 12. Return
  -- ============================================================

  return jsonb_build_object(
    'success', true,
    'already_granted', false,

    'transaction_id', v_transaction_id,

    'base_xp', v_base_xp,

    'multiplier', v_multiplier,

    'awarded_xp', v_awarded_xp,

    'boost_active',
      (
        v_multiplier > 1
        and v_boost_until is not null
        and v_boost_until > clock_timestamp()
      ),

    'boost_until', v_boost_until,

    'total_xp', v_total_xp
  );

end;
$function$


CREATE OR REPLACE FUNCTION public.admin_get_league(p_league_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.admin_require('read');
  select jsonb_build_object('league',to_jsonb(l),'weeks',coalesce((select jsonb_agg(to_jsonb(w) order by w.week_start desc) from public.league_weeks w where w.league_id=l.id),'[]'::jsonb)) into v from public.leagues l where l.id=p_league_id;
  if v is null then raise exception 'LEAGUE_NOT_FOUND'; end if; return v;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_league_members(p_league_week_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('read'); if not exists(select 1 from public.league_weeks where id=p_league_week_id) then raise exception 'LEAGUE_WEEK_NOT_FOUND'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('member',to_jsonb(m),'email',u.email,'username',p.username,'full_name',p.full_name) order by coalesce(m.rank,2147483647),m.weekly_xp desc) from public.league_members m join auth.users u on u.id=m.user_id left join public.profiles p on p.id=m.user_id where m.league_week_id=p_league_week_id),'[]'::jsonb);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_question(p_question_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.admin_require('read');
  select jsonb_build_object('question',to_jsonb(q),'lesson',to_jsonb(l),'unit',to_jsonb(u),'course',to_jsonb(c),
    'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.order_index) from public.question_options o where o.question_id=q.id),'[]'::jsonb))
  into v from public.questions q join public.lessons l on l.id=q.lesson_id join public.units u on u.id=l.unit_id join public.courses c on c.id=u.course_id where q.id=p_question_id;
  if v is null then raise exception 'QUESTION_NOT_FOUND'; end if; return v;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_unit(p_unit_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.admin_require('read');
  select jsonb_build_object('unit',to_jsonb(u),'course',to_jsonb(c),
    'lessons',coalesce((select jsonb_agg(to_jsonb(l) order by l.order_index) from public.lessons l where l.unit_id=u.id),'[]'::jsonb))
  into v from public.units u join public.courses c on c.id=u.course_id where u.id=p_unit_id;
  if v is null then raise exception 'UNIT_NOT_FOUND'; end if; return v;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_units(p_course_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('read');
  if not exists(select 1 from public.courses where id=p_course_id) then raise exception 'COURSE_NOT_FOUND'; end if;
  return coalesce((select jsonb_agg(to_jsonb(u) order by u.order_index) from public.units u where u.course_id=p_course_id),'[]'::jsonb);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_user_overview(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.admin_require('user_read');
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if;
  select jsonb_build_object(
    'user',jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at),
    'profile',coalesce((select to_jsonb(p) from public.profiles p where p.id=u.id),'null'::jsonb),
    'stats',coalesce((select to_jsonb(s) from public.user_stats s where s.user_id=u.id),'null'::jsonb),
    'courses',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_courses x where x.user_id=u.id),'[]'::jsonb),
    'unit_progress',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_unit_progress x where x.user_id=u.id),'[]'::jsonb),
    'lesson_progress',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_lesson_progress x where x.user_id=u.id),'[]'::jsonb),
    'question_progress',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_question_progress x where x.user_id=u.id),'[]'::jsonb),
    'achievements',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_achievements x where x.user_id=u.id),'[]'::jsonb),
    'league_memberships',coalesce((select jsonb_agg(to_jsonb(x)) from public.league_members x where x.user_id=u.id),'[]'::jsonb),
    'gem_balance',coalesce((select to_jsonb(x) from public.user_gems x where x.user_id=u.id),'null'::jsonb),
    'xp_transactions',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.xp_transactions where user_id=u.id order by created_at desc limit 100) x),'[]'::jsonb),
    'heart_transactions',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.heart_transactions where user_id=u.id order by created_at desc limit 100) x),'[]'::jsonb),
    'gem_transactions',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.gem_transactions where user_id=u.id order by created_at desc limit 100) x),'[]'::jsonb),
    'recent_attempts',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.question_attempts where user_id=u.id order by created_at desc limit 100) x),'[]'::jsonb),
    'recent_lesson_attempts',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.lesson_attempts where user_id=u.id order by created_at desc limit 100) x),'[]'::jsonb)
  ) into v from auth.users u where u.id=p_user_id;
  return v;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_users(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('user_read');
  if p_limit<1 or p_limit>200 then raise exception 'INVALID_LIMIT'; end if;
  if p_offset<0 then raise exception 'INVALID_OFFSET'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select u.id user_id,u.email,u.created_at,p.username,p.full_name,p.avatar_url,p.bio,p.native_language_id,p.target_language_id,p.daily_goal_minutes,
           s.total_xp,s.hearts,s.max_hearts,s.streak_days,s.last_activity_date
    from auth.users u left join public.profiles p on p.id=u.id left join public.user_stats s on s.user_id=u.id
    where p_search is null or coalesce(u.email,'') ilike '%'||p_search||'%' or coalesce(p.username,'') ilike '%'||p_search||'%' or coalesce(p.full_name,'') ilike '%'||p_search||'%'
    order by u.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_question_bank(p_course_id bigint DEFAULT NULL::bigint, p_unit_id bigint DEFAULT NULL::bigint, p_lesson_id bigint DEFAULT NULL::bigint, p_type public.question_type DEFAULT NULL::public.question_type, p_is_published boolean DEFAULT NULL::boolean, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$begin
  perform public.admin_require('read');

  if p_limit < 1 or p_limit > 500 then
    raise exception 'INVALID_LIMIT';
  end if;

  if p_offset < 0 then
    raise exception 'INVALID_OFFSET';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        to_jsonb(x)
        order by
          x.course_title,
          x.unit_order,
          x.lesson_order,
          x.question_order
      )
      from (
        select
          q.*,
          c.id as course_id,
          c.code as course_code,
          c.title as course_title,
          u.id as unit_id,
          u.title as unit_title,
          u.order_index as unit_order,
          l.title as lesson_title,
          l.order_index as lesson_order,

          (
            select count(*)
            from public.question_options o
            where o.question_id = q.id
          ) as option_count,

          coalesce(
            (
              select jsonb_agg(
                to_jsonb(o)
                order by o.order_index, o.id
              )
              from public.question_options o
              where o.question_id = q.id
            ),
            '[]'::jsonb
          ) as options,

          (
            select count(*)
            from public.question_attempts a
            where a.question_id = q.id
          ) as attempt_count,

          q.order_index as question_order
        from public.questions q
        join public.lessons l on l.id = q.lesson_id
        join public.units u on u.id = l.unit_id
        join public.courses c on c.id = u.course_id
        where
          (p_course_id is null or c.id = p_course_id)
          and (p_unit_id is null or u.id = p_unit_id)
          and (p_lesson_id is null or l.id = p_lesson_id)
          and (p_type is null or q.type = p_type)
          and (p_is_published is null or q.is_published = p_is_published)
          and (
            p_search is null
            or coalesce(q.prompt, '') ilike '%' || p_search || '%'
          )
        order by
          c.title,
          u.order_index,
          l.order_index,
          q.order_index
        limit p_limit
        offset p_offset
      ) x
    ),
    '[]'::jsonb
  );
end;$function$


CREATE OR REPLACE FUNCTION public.admin_publish_lesson(p_lesson_id bigint, p_is_published boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.lessons; a public.lessons;
begin
  perform public.admin_require('content'); select * into b from public.lessons where id=p_lesson_id for update;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if p_is_published then
    if not exists(select 1 from public.lessons l join public.units u on u.id=l.unit_id join public.courses c on c.id=u.course_id
                  where l.id=p_lesson_id and c.is_active and u.is_published) then
      raise exception 'PARENT_CONTENT_NOT_PUBLISHED_OR_INACTIVE';
    end if;
    if not exists(select 1 from public.questions where lesson_id=p_lesson_id) then raise exception 'LESSON_HAS_NO_QUESTIONS'; end if;
  end if;
  update public.lessons set is_published=p_is_published,updated_at=now() where id=p_lesson_id returning * into a;
  perform public.admin_audit('PUBLISH_STATE','lesson',p_lesson_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_publish_question(p_question_id bigint, p_is_published boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b jsonb; a jsonb; v jsonb;
begin
  perform public.admin_require('content'); b:=public.admin_get_question(p_question_id);
  if b is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  if p_is_published then
    v:=public.admin_validate_question(p_question_id);
    if not (v->>'valid')::boolean then raise exception 'QUESTION_VALIDATION_FAILED: %',v::text; end if;
    if not exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id join public.units u on u.id=l.unit_id join public.courses c on c.id=u.course_id where q.id=p_question_id and c.is_active and u.is_published and l.is_published)
      then raise exception 'PARENT_CONTENT_NOT_PUBLISHED_OR_INACTIVE'; end if;
  end if;
  update public.questions set is_published=p_is_published,updated_at=now() where id=p_question_id;
  a:=public.admin_get_question(p_question_id); perform public.admin_audit('PUBLISH_STATE','question',p_question_id::text,b,a); return a;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_reorder_lessons(p_unit_id bigint, p_lesson_ids bigint[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare cnt int; expected int;
begin
  perform public.admin_require('content'); select count(*) into cnt from public.lessons where unit_id=p_unit_id;
  expected:=coalesce(array_length(p_lesson_ids,1),0);
  if cnt<>expected then raise exception 'LESSON_REORDER_MUST_INCLUDE_ALL_LESSONS'; end if;
  if exists(select 1 from unnest(p_lesson_ids) z(id) left join public.lessons l on l.id=z.id and l.unit_id=p_unit_id where l.id is null)
    then raise exception 'INVALID_LESSON_ORDER'; end if;
  update public.lessons set order_index=order_index+1000000,updated_at=now() where unit_id=p_unit_id;
  update public.lessons l set order_index=z.ord-1,updated_at=now()
  from unnest(p_lesson_ids) with ordinality z(id,ord) where l.id=z.id and l.unit_id=p_unit_id;
  perform public.admin_audit('REORDER','lesson',p_unit_id::text,null,jsonb_build_object('ids',p_lesson_ids));
  return public.admin_get_lessons(p_unit_id);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_reorder_questions(p_lesson_id bigint, p_question_ids bigint[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare cnt int; expected int;
begin
  perform public.admin_require('content'); select count(*) into cnt from public.questions where lesson_id=p_lesson_id; expected:=coalesce(array_length(p_question_ids,1),0);
  if cnt<>expected then raise exception 'QUESTION_REORDER_MUST_INCLUDE_ALL_QUESTIONS'; end if;
  if exists(select 1 from unnest(p_question_ids) z(id) left join public.questions q on q.id=z.id and q.lesson_id=p_lesson_id where q.id is null) then raise exception 'INVALID_QUESTION_ORDER'; end if;
  update public.questions set order_index=order_index+1000000,updated_at=now() where lesson_id=p_lesson_id;
  update public.questions q set order_index=z.ord-1,updated_at=now() from unnest(p_question_ids) with ordinality z(id,ord) where q.id=z.id and q.lesson_id=p_lesson_id;
  perform public.admin_audit('REORDER','question',p_lesson_id::text,null,jsonb_build_object('ids',p_question_ids));
  return public.admin_get_question_bank(null,null,p_lesson_id,null,null,null,500,0);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_reorder_units(p_course_id bigint, p_unit_ids bigint[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare cnt int; expected int;
begin
  perform public.admin_require('content');
  select count(*) into cnt from public.units where course_id=p_course_id;
  expected:=coalesce(array_length(p_unit_ids,1),0);
  if cnt<>expected then raise exception 'UNIT_REORDER_MUST_INCLUDE_ALL_UNITS'; end if;
  if exists(select 1 from unnest(p_unit_ids) z(id) left join public.units u on u.id=z.id and u.course_id=p_course_id where u.id is null)
    then raise exception 'INVALID_UNIT_ORDER'; end if;
  update public.units set order_index=order_index+1000000,updated_at=now() where course_id=p_course_id;
  update public.units u set order_index=z.ord-1,updated_at=now()
  from unnest(p_unit_ids) with ordinality z(id,ord) where u.id=z.id and u.course_id=p_course_id;
  perform public.admin_audit('REORDER','unit',p_course_id::text,null,jsonb_build_object('ids',p_unit_ids));
  return public.admin_get_units(p_course_id);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_set_course_active(p_course_id bigint, p_is_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.courses; a public.courses;
begin
  perform public.admin_require('content');
  select * into b from public.courses where id=p_course_id for update;
  if not found then raise exception 'COURSE_NOT_FOUND'; end if;
  update public.courses set is_active=p_is_active,updated_at=now()
  where id=p_course_id returning * into a;
  perform public.admin_audit('SET_ACTIVE','course',p_course_id::text,to_jsonb(b),to_jsonb(a));
  return to_jsonb(a);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_set_shop_item_active(p_shop_item_id bigint, p_is_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.shop_items; a public.shop_items;
begin perform public.admin_require('content'); select * into b from public.shop_items where id=p_shop_item_id for update; if not found then raise exception 'SHOP_ITEM_NOT_FOUND'; end if; update public.shop_items set is_active=p_is_active,updated_at=now() where id=p_shop_item_id returning * into a; perform public.admin_audit('SET_ACTIVE','shop_item',p_shop_item_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a); end; $function$


CREATE OR REPLACE FUNCTION public.admin_update_achievement(p_achievement_id bigint, p_code text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_icon_url text DEFAULT NULL::text, p_requirement_type text DEFAULT NULL::text, p_requirement_value integer DEFAULT NULL::integer, p_xp_reward integer DEFAULT NULL::integer, p_gem_reward integer DEFAULT NULL::integer, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.achievements; a public.achievements;
begin
  perform public.admin_require('content'); select * into b from public.achievements where id=p_achievement_id for update; if not found then raise exception 'ACHIEVEMENT_NOT_FOUND'; end if;
  update public.achievements set code=coalesce(nullif(trim(p_code),''),code),title=coalesce(nullif(trim(p_title),''),title),description=coalesce(p_description,description),icon_url=coalesce(p_icon_url,icon_url),requirement_type=coalesce(nullif(trim(p_requirement_type),''),requirement_type),requirement_value=coalesce(p_requirement_value,requirement_value),xp_reward=coalesce(p_xp_reward,xp_reward),gem_reward=coalesce(p_gem_reward,gem_reward),is_active=coalesce(p_is_active,is_active) where id=p_achievement_id returning * into a;
  perform public.admin_audit('UPDATE','achievement',p_achievement_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a);
exception when unique_violation then raise exception 'ACHIEVEMENT_CODE_ALREADY_EXISTS';
end; $function$


CREATE OR REPLACE FUNCTION public.admin_update_course(p_course_id bigint, p_code text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_source_language text DEFAULT NULL::text, p_target_language text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.courses; a public.courses;
begin
  perform public.admin_require('content');
  select * into b from public.courses where id=p_course_id for update;
  if not found then raise exception 'COURSE_NOT_FOUND'; end if;
  update public.courses set
    code=coalesce(nullif(trim(p_code),''),code),title=coalesce(nullif(trim(p_title),''),title),
    source_language=coalesce(nullif(trim(p_source_language),''),source_language),
    target_language=coalesce(nullif(trim(p_target_language),''),target_language),
    is_active=coalesce(p_is_active,is_active),metadata=coalesce(p_metadata,metadata),updated_at=now()
  where id=p_course_id returning * into a;
  perform public.admin_audit('UPDATE','course',p_course_id::text,to_jsonb(b),to_jsonb(a));
  return to_jsonb(a);
exception when unique_violation then raise exception 'COURSE_CODE_ALREADY_EXISTS';
end; $function$


CREATE OR REPLACE FUNCTION public.admin_update_lesson(p_lesson_id bigint, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_icon_url text DEFAULT NULL::text, p_xp_reward integer DEFAULT NULL::integer, p_estimated_minutes integer DEFAULT NULL::integer, p_metadata jsonb DEFAULT NULL::jsonb, p_is_published boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.lessons; a public.lessons;
begin
  perform public.admin_require('content'); select * into b from public.lessons where id=p_lesson_id for update;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if p_xp_reward is not null and p_xp_reward<0 then raise exception 'INVALID_XP_REWARD'; end if;
  if p_estimated_minutes is not null and p_estimated_minutes<=0 then raise exception 'INVALID_ESTIMATED_MINUTES'; end if;
  update public.lessons set title=coalesce(nullif(trim(p_title),''),title),description=coalesce(p_description,description),
    image_url=coalesce(p_image_url,image_url),icon_url=coalesce(p_icon_url,icon_url),xp_reward=coalesce(p_xp_reward,xp_reward),
    estimated_minutes=coalesce(p_estimated_minutes,estimated_minutes),metadata=coalesce(p_metadata,metadata),
    is_published=coalesce(p_is_published,is_published),updated_at=now()
  where id=p_lesson_id returning * into a;
  perform public.admin_audit('UPDATE','lesson',p_lesson_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_update_question_with_options(p_question_id bigint, p_type public.question_type DEFAULT NULL::public.question_type, p_prompt text DEFAULT NULL::text, p_instruction text DEFAULT NULL::text, p_hint text DEFAULT NULL::text, p_explanation text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_target_text text DEFAULT NULL::text, p_target_translation text DEFAULT NULL::text, p_xp integer DEFAULT NULL::integer, p_difficulty integer DEFAULT NULL::integer, p_metadata jsonb DEFAULT NULL::jsonb, p_normalization_config jsonb DEFAULT NULL::jsonb, p_accepted_answers jsonb DEFAULT NULL::jsonb, p_audio_url text DEFAULT NULL::text, p_audio_text text DEFAULT NULL::text, p_audio_language text DEFAULT NULL::text, p_audio_speed numeric DEFAULT NULL::numeric, p_audio_config jsonb DEFAULT NULL::jsonb, p_speaking_config jsonb DEFAULT NULL::jsonb, p_fill_blank_config jsonb DEFAULT NULL::jsonb, p_word_bank_config jsonb DEFAULT NULL::jsonb, p_time_limit_seconds integer DEFAULT NULL::integer, p_is_published boolean DEFAULT NULL::boolean, p_options jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare before_data jsonb; after_data jsonb; t public.question_type; correct_count int; opt_count int;
begin
  perform public.admin_require('content'); before_data:=public.admin_get_question(p_question_id);
  if before_data is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  select type into t from public.questions where id=p_question_id for update;
  if p_xp is not null and p_xp<0 then raise exception 'INVALID_QUESTION_XP'; end if;
  if p_difficulty is not null and p_difficulty not between 1 and 5 then raise exception 'INVALID_DIFFICULTY'; end if;
  if p_audio_speed is not null and p_audio_speed<=0 then raise exception 'INVALID_AUDIO_SPEED'; end if;
  if p_time_limit_seconds is not null and p_time_limit_seconds<=0 then raise exception 'INVALID_TIME_LIMIT'; end if;
  update public.questions set type=coalesce(p_type,type),prompt=coalesce(p_prompt,prompt),instruction=coalesce(p_instruction,instruction),
    hint=coalesce(p_hint,hint),explanation=coalesce(p_explanation,explanation),image_url=coalesce(p_image_url,image_url),
    target_text=coalesce(p_target_text,target_text),target_translation=coalesce(p_target_translation,target_translation),xp=coalesce(p_xp,xp),
    difficulty=coalesce(p_difficulty,difficulty),metadata=coalesce(p_metadata,metadata),normalization_config=coalesce(p_normalization_config,normalization_config),
    accepted_answers=coalesce(p_accepted_answers,accepted_answers),audio_url=coalesce(p_audio_url,audio_url),audio_text=coalesce(p_audio_text,audio_text),
    audio_language=coalesce(p_audio_language,audio_language),audio_speed=coalesce(p_audio_speed,audio_speed),audio_config=coalesce(p_audio_config,audio_config),
    speaking_config=coalesce(p_speaking_config,speaking_config),fill_blank_config=coalesce(p_fill_blank_config,fill_blank_config),word_bank_config=coalesce(p_word_bank_config,word_bank_config),
    time_limit_seconds=coalesce(p_time_limit_seconds,time_limit_seconds),is_published=coalesce(p_is_published,is_published),updated_at=now()
  where id=p_question_id;
  if p_options is not null then
    if jsonb_typeof(p_options)<>'array' then raise exception 'OPTIONS_MUST_BE_ARRAY'; end if;
    delete from public.question_options where question_id=p_question_id;
    insert into public.question_options(question_id,text,image_url,audio_url,order_index,is_correct,correct_order,metadata)
    select p_question_id,x.text,x.image_url,x.audio_url,x.order_index,x.is_correct,x.correct_order,coalesce(x.metadata,'{}'::jsonb)
    from jsonb_to_recordset(p_options) x(text text,image_url text,audio_url text,order_index integer,is_correct boolean,correct_order integer,metadata jsonb);
  end if;
  select type into t from public.questions where id=p_question_id;
  select count(*),count(*) filter(where is_correct) into opt_count,correct_count from public.question_options where question_id=p_question_id;
  if t='MCQ_SINGLE' and opt_count>0 and correct_count<>1 then raise exception 'MCQ_SINGLE_REQUIRES_ONE_CORRECT_OPTION'; end if;
  if t='MCQ_MULTI' and opt_count>0 and correct_count<1 then raise exception 'MCQ_MULTI_REQUIRES_CORRECT_OPTION'; end if;
  after_data:=public.admin_get_question(p_question_id);
  perform public.admin_audit('UPDATE','question',p_question_id::text,before_data,after_data); return after_data;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_update_shop_item(p_shop_item_id bigint, p_code text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_item_type text DEFAULT NULL::text, p_gem_price bigint DEFAULT NULL::bigint, p_quantity integer DEFAULT NULL::integer, p_icon_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.shop_items; a public.shop_items;
begin
  perform public.admin_require('content'); select * into b from public.shop_items where id=p_shop_item_id for update; if not found then raise exception 'SHOP_ITEM_NOT_FOUND'; end if;
  update public.shop_items set code=coalesce(nullif(trim(p_code),''),code),name=coalesce(nullif(trim(p_name),''),name),description=coalesce(p_description,description),item_type=coalesce(nullif(trim(p_item_type),''),item_type),gem_price=coalesce(p_gem_price,gem_price),quantity=coalesce(p_quantity,quantity),icon_url=coalesce(p_icon_url,icon_url),metadata=coalesce(p_metadata,metadata),is_active=coalesce(p_is_active,is_active),updated_at=now() where id=p_shop_item_id returning * into a;
  perform public.admin_audit('UPDATE','shop_item',p_shop_item_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a);
exception when unique_violation then raise exception 'SHOP_CODE_ALREADY_EXISTS';
end; $function$


CREATE OR REPLACE FUNCTION public.admin_update_unit(p_unit_id bigint, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_icon_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb, p_is_published boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.units; a public.units;
begin
  perform public.admin_require('content'); select * into b from public.units where id=p_unit_id for update;
  if not found then raise exception 'UNIT_NOT_FOUND'; end if;
  update public.units set title=coalesce(nullif(trim(p_title),''),title),description=coalesce(p_description,description),
    image_url=coalesce(p_image_url,image_url),icon_url=coalesce(p_icon_url,icon_url),metadata=coalesce(p_metadata,metadata),
    is_published=coalesce(p_is_published,is_published),updated_at=now()
  where id=p_unit_id returning * into a;
  perform public.admin_audit('UPDATE','unit',p_unit_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a);
end; $function$


CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$


CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at = now(); return new; end;
$function$


CREATE OR REPLACE FUNCTION public.admin_audit(p_action text, p_entity_type text DEFAULT NULL::text, p_entity_id text DEFAULT NULL::text, p_before jsonb DEFAULT NULL::jsonb, p_after jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  insert into public.admin_audit_logs(
    admin_user_id,action,entity_type,entity_id,before_data,after_data,metadata
  ) values (
    auth.uid(),p_action,p_entity_type,p_entity_id,p_before,p_after,coalesce(p_metadata,'{}'::jsonb)
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.admin_get_current_admin()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid; v_result jsonb;
begin
  v_uid:=public.admin_require('read');
  select jsonb_build_object(
    'user_id',a.user_id,'email',u.email,'role',a.role,
    'is_active',a.is_active,'created_at',a.created_at
  ) into v_result
  from public.admin_users a join auth.users u on u.id=a.user_id
  where a.user_id=v_uid;
  return v_result;
end; $function$


CREATE OR REPLACE FUNCTION public.admin_validate_before_publish(p_entity_type text, p_entity_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('read');
  case p_entity_type
    when 'question' then return public.admin_validate_question(p_entity_id);
    when 'lesson' then return public.admin_validate_content_tree(null,null,p_entity_id);
    when 'unit' then return public.admin_validate_content_tree(null,p_entity_id,null);
    when 'course' then return public.admin_validate_content_tree(p_entity_id,null,null);
    else raise exception 'INVALID_ENTITY_TYPE';
  end case;
end; $function$


CREATE OR REPLACE FUNCTION public.get_shop_purchase_transactions(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 100);
  v_offset integer;
  v_total_count bigint;
  v_has_more boolean;
  v_data jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  WITH matching_rows AS (
    SELECT
      sp.id,
      sp.user_id,
      sp.shop_item_id,
      sp.quantity,
      sp.total_cost,
      sp.request_id,
      sp.created_at,
      si.code AS item_code,
      si.name AS item_name,
      si.description AS item_description,
      si.item_type,
      si.gem_price,
      si.icon_url
    FROM public.shop_purchases AS sp
    JOIN public.shop_items AS si ON si.id = sp.shop_item_id
    WHERE sp.user_id = auth.uid()
  ),
  stats AS (
    SELECT COUNT(*)::bigint AS total_count
    FROM matching_rows
  ),
  page_rows AS (
    SELECT *
    FROM matching_rows
    ORDER BY created_at DESC, id DESC
    OFFSET v_offset
    LIMIT v_page_size
  )
  SELECT
    stats.total_count,
    stats.total_count > (v_offset + v_page_size),
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', numbered.id,
            'user_id', numbered.user_id,
            'shop_item_id', numbered.shop_item_id,
            'quantity', numbered.quantity,
            'total_cost', numbered.total_cost,
            'request_id', numbered.request_id,
            'created_at', numbered.created_at,
            'item', jsonb_build_object(
              'code', numbered.item_code,
              'name', numbered.item_name,
              'description', numbered.item_description,
              'item_type', numbered.item_type,
              'gem_price', numbered.gem_price,
              'icon_url', numbered.icon_url
            )
          ) ORDER BY numbered.created_at DESC, numbered.id DESC
        )
        FROM page_rows AS numbered
      ),
      '[]'::jsonb
    )
  INTO v_total_count, v_has_more, v_data
  FROM stats;

  RETURN jsonb_build_object(
    'data', v_data,
    'page', v_page,
    'page_size', v_page_size,
    'total_count', v_total_count,
    'has_more', v_has_more
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.admin_create_question_with_options(p_lesson_id bigint, p_type public.question_type, p_prompt text DEFAULT NULL::text, p_instruction text DEFAULT NULL::text, p_hint text DEFAULT NULL::text, p_explanation text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_target_text text DEFAULT NULL::text, p_target_translation text DEFAULT NULL::text, p_xp integer DEFAULT 10, p_difficulty integer DEFAULT NULL::integer, p_metadata jsonb DEFAULT '{}'::jsonb, p_normalization_config jsonb DEFAULT NULL::jsonb, p_accepted_answers jsonb DEFAULT '[]'::jsonb, p_audio_url text DEFAULT NULL::text, p_audio_text text DEFAULT NULL::text, p_audio_language text DEFAULT NULL::text, p_audio_speed numeric DEFAULT 1.00, p_audio_config jsonb DEFAULT '{}'::jsonb, p_speaking_config jsonb DEFAULT NULL::jsonb, p_fill_blank_config jsonb DEFAULT '{}'::jsonb, p_word_bank_config jsonb DEFAULT '{}'::jsonb, p_time_limit_seconds integer DEFAULT NULL::integer, p_is_published boolean DEFAULT false, p_options jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$

declare
  q public.questions;
  next_order integer;
  option_count integer;
  correct_count integer;

begin

  -- Admin permission
  perform public.admin_require('content');


  -- Validate lesson
  if not exists (
    select 1
    from public.lessons
    where id = p_lesson_id
  ) then
    raise exception 'LESSON_NOT_FOUND';
  end if;


  -- Validate XP
  if coalesce(p_xp, 10) < 0 then
    raise exception 'INVALID_QUESTION_XP';
  end if;


  -- Validate difficulty
  if p_difficulty is not null
     and p_difficulty not between 1 and 5
  then
    raise exception 'INVALID_DIFFICULTY';
  end if;


  -- Validate audio speed
  if coalesce(p_audio_speed, 1.00) <= 0 then
    raise exception 'INVALID_AUDIO_SPEED';
  end if;


  -- Validate time limit
  if p_time_limit_seconds is not null
     and p_time_limit_seconds < 1
  then
    raise exception 'INVALID_TIME_LIMIT';
  end if;


  -- Validate options JSON
  if jsonb_typeof(
       coalesce(p_options, '[]'::jsonb)
     ) <> 'array'
  then
    raise exception 'OPTIONS_MUST_BE_ARRAY';
  end if;


  -- Get next question order
  select coalesce(max(order_index), -1) + 1
  into next_order
  from public.questions
  where lesson_id = p_lesson_id;


  -- Create question
  insert into public.questions (
    lesson_id,
    type,
    order_index,
    prompt,
    instruction,
    hint,
    explanation,
    image_url,
    target_text,
    target_translation,
    xp,
    difficulty,
    is_published,
    metadata,
    normalization_config,
    accepted_answers,
    audio_url,
    audio_text,
    audio_language,
    audio_speed,
    audio_config,
    speaking_config,
    fill_blank_config,
    word_bank_config,
    time_limit_seconds
  )
  values (
    p_lesson_id,
    p_type,
    next_order,
    p_prompt,
    p_instruction,
    p_hint,
    p_explanation,
    p_image_url,
    p_target_text,
    p_target_translation,
    coalesce(p_xp, 10),
    p_difficulty,
    coalesce(p_is_published, false),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(
      p_normalization_config,
      '{
        "ignore_case": true,
        "ignore_punctuation": true,
        "trim_whitespace": true,
        "collapse_whitespace": true,
        "remove_diacritics": false
      }'::jsonb
    ),
    coalesce(p_accepted_answers, '[]'::jsonb),
    p_audio_url,
    p_audio_text,
    p_audio_language,
    coalesce(p_audio_speed, 1.00),
    coalesce(p_audio_config, '{}'::jsonb),
    coalesce(p_speaking_config, '{}'::jsonb),
    coalesce(p_fill_blank_config, '{}'::jsonb),
    coalesce(p_word_bank_config, '{}'::jsonb),
    p_time_limit_seconds
  )
  returning *
  into q;


  -- Create options
  -- question_id is automatically assigned here
  insert into public.question_options (
    question_id,
    text,
    image_url,
    audio_url,
    order_index,
    is_correct,
    correct_order,
    metadata
  )
  select
    q.id,
    x.text,
    x.image_url,
    x.audio_url,
    x.order_index,
    coalesce(x.is_correct, false),
    x.correct_order,
    coalesce(x.metadata, '{}'::jsonb)
  from jsonb_to_recordset(
    coalesce(p_options, '[]'::jsonb)
  ) as x(
    text text,
    image_url text,
    audio_url text,
    order_index integer,
    is_correct boolean,
    correct_order integer,
    metadata jsonb
  );


  -- Count options
  select
    count(*),
    count(*) filter (
      where is_correct = true
    )
  into
    option_count,
    correct_count
  from public.question_options
  where question_id = q.id;


  -- MCQ single validation
  if p_type = 'MCQ_SINGLE'
     and option_count = 0
  then
    raise exception 'MCQ_REQUIRES_OPTIONS';
  end if;


  if p_type = 'MCQ_SINGLE'
     and correct_count <> 1
  then
    raise exception 'MCQ_SINGLE_REQUIRES_ONE_CORRECT_OPTION';
  end if;


  -- MCQ multiple validation
  if p_type = 'MCQ_MULTI'
     and option_count = 0
  then
    raise exception 'MCQ_REQUIRES_OPTIONS';
  end if;


  if p_type = 'MCQ_MULTI'
     and correct_count < 1
  then
    raise exception 'MCQ_MULTI_REQUIRES_CORRECT_OPTION';
  end if;


  -- Audit
  perform public.admin_audit(
    'CREATE',
    'question',
    q.id::text,
    null,
    public.admin_get_question(q.id)
  );


  -- Return complete question
  return public.admin_get_question(q.id);

end;

$function$


CREATE OR REPLACE FUNCTION public.export_schema_elements()
 RETURNS TABLE(object_type text, object_name text, ddl_definition text)
 LANGUAGE sql
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT
    'rpc'::text,
    n.nspname || '.' || p.proname,
    pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')

  UNION ALL

  SELECT
    'enum'::text,
    n.nspname || '.' || t.typname,
    'CREATE TYPE ' ||
      quote_ident(n.nspname) || '.' ||
      quote_ident(t.typname) ||
      ' AS ENUM (' ||
      string_agg(
        quote_literal(e.enumlabel),
        ', ' ORDER BY e.enumsortorder
      ) ||
      ');'
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY n.nspname, t.typname;
$function$


CREATE OR REPLACE FUNCTION public.admin_publish_unit(p_unit_id bigint, p_is_published boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.units; a public.units;
begin
  perform public.admin_require('content'); select * into b from public.units where id=p_unit_id for update;
  if not found then raise exception 'UNIT_NOT_FOUND'; end if;
  if p_is_published and not exists(select 1 from public.units u join public.courses c on c.id=u.course_id where u.id=p_unit_id and c.is_active)
    then raise exception 'PARENT_COURSE_INACTIVE'; end if;
  update public.units set is_published=p_is_published,updated_at=now() where id=p_unit_id returning * into a;
  perform public.admin_audit('PUBLISH_STATE','unit',p_unit_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_lesson(p_lesson_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.admin_require('read');
  select jsonb_build_object('lesson',to_jsonb(l),'unit',to_jsonb(u),'course',to_jsonb(c),
    'questions',coalesce((select jsonb_agg(to_jsonb(q) order by q.order_index) from public.questions q where q.lesson_id=l.id),'[]'::jsonb))
  into v from public.lessons l join public.units u on u.id=l.unit_id join public.courses c on c.id=u.course_id where l.id=p_lesson_id;
  if v is null then raise exception 'LESSON_NOT_FOUND'; end if; return v;
end; $function$


CREATE OR REPLACE FUNCTION public.get_courses()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'title',c.title,'source_language',c.source_language,'target_language',c.target_language,'selected',coalesce(uc.is_active,false)) order by c.id),'[]'::jsonb) from public.courses c left join public.user_courses uc on uc.course_id=c.id and uc.user_id=auth.uid() where c.is_active; $function$


CREATE OR REPLACE FUNCTION public.set_active_course(p_course_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ declare u uuid:=auth.uid(); begin if u is null then raise exception 'AUTH_REQUIRED'; end if; if not exists(select 1 from public.courses where id=p_course_id and is_active) then raise exception 'COURSE_NOT_FOUND'; end if; update public.user_courses set is_active=false,updated_at=now() where user_id=u and is_active;
 insert into public.user_courses(user_id,course_id,is_active) values(u,p_course_id,true) on conflict(user_id,course_id) do update set is_active=true,last_accessed_at=now(),updated_at=now();
 insert into public.user_unit_progress(user_id,unit_id,unlocked)
 select u,un.id,true from public.units un where un.course_id=p_course_id and un.is_published order by un.order_index limit 1
 on conflict(user_id,unit_id) do update set unlocked=true,updated_at=now();
 insert into public.user_lesson_progress(user_id,lesson_id,status,total_questions)
 select u,ls.id,'AVAILABLE',(select count(*) from public.questions q where q.lesson_id=ls.id and q.is_published)
 from public.lessons ls join public.units un on un.id=ls.unit_id
 where un.course_id=p_course_id and un.is_published and ls.is_published order by un.order_index,ls.order_index limit 1
 on conflict(user_id,lesson_id) do update set status=case when public.user_lesson_progress.status='COMPLETED' then 'COMPLETED' else 'AVAILABLE' end,updated_at=now();
 return jsonb_build_object('success',true,'course_id',p_course_id); end; $function$


CREATE OR REPLACE FUNCTION public.get_curriculum()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'course_id',u.course_id,'title',u.title,'description',u.description,'image_url',u.image_url,'icon_url',u.icon_url,'order_index',u.order_index,'unlocked',coalesce(up.unlocked,false),'completed',coalesce(up.completed,false),'lessons',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'title',l.title,'description',l.description,'image_url',l.image_url,'icon_url',l.icon_url,'order_index',l.order_index,'xp_reward',l.xp_reward,'estimated_minutes',l.estimated_minutes,'status',coalesce(lp.status,'LOCKED'),'completed_questions',coalesce(lp.completed_questions,0),'total_questions',coalesce(lp.total_questions,(select count(*) from public.questions q where q.lesson_id=l.id and q.is_published)),'best_score',coalesce(lp.best_score,0)) order by l.order_index) from public.lessons l left join public.user_lesson_progress lp on lp.lesson_id=l.id and lp.user_id=auth.uid() where l.unit_id=u.id and l.is_published),'[]'::jsonb)) order by u.order_index),'[]'::jsonb)
from public.units u left join public.user_unit_progress up on up.unit_id=u.id and up.user_id=auth.uid() where u.is_published and u.course_id=public.get_active_course_id(auth.uid());
$function$


CREATE OR REPLACE FUNCTION public.get_daily_gamification()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare u uuid:=auth.uid(); d date:=current_date; s public.user_stats%rowtype; g public.user_daily_goals%rowtype; w public.user_gems%rowtype; x public.user_xp_daily%rowtype;
begin if u is null then raise exception 'AUTH_REQUIRED'; end if; perform public.ensure_daily_goal(u,d); select * into s from public.user_stats where user_id=u; w:=public.ensure_gem_wallet(u); select * into g from public.user_daily_goals where user_id=u and goal_date=d; select * into x from public.user_xp_daily where user_id=u and xp_date=d; return jsonb_build_object('date',d,'streak_days',s.streak_days,'hearts',s.hearts,'max_hearts',s.max_hearts,'total_xp',s.total_xp,'gems',w.balance,'daily_goal',to_jsonb(g),'daily_xp',coalesce(to_jsonb(x),'{}'::jsonb)); end; $function$


CREATE OR REPLACE FUNCTION public.get_user_streak()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select jsonb_build_object('streak_days',coalesce((select streak_days from public.user_stats where user_id=auth.uid()),0),'last_activity_date',(select last_activity_date from public.user_stats where user_id=auth.uid()),'recent_days',coalesce((select jsonb_agg(to_jsonb(s) order by activity_date desc) from (select * from public.user_streak_days where user_id=auth.uid() order by activity_date desc limit 30) s),'[]'::jsonb));
$function$


CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$


CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$


CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$


CREATE OR REPLACE FUNCTION public.normalize_answer(p_text text, p_config jsonb DEFAULT '{}'::jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v text := coalesce(p_text,'');
begin
  if coalesce((p_config->>'ignore_case')::boolean, true) then v := lower(v); end if;
  if coalesce((p_config->>'ignore_punctuation')::boolean, true) then v := regexp_replace(v, '[[:punct:]]+', ' ', 'g'); end if;
  if coalesce((p_config->>'remove_diacritics')::boolean, false) then v := public.unaccent(v); end if;
  if coalesce((p_config->>'collapse_whitespace')::boolean, true) then v := regexp_replace(v, '\s+', ' ', 'g'); end if;
  if coalesce((p_config->>'trim_whitespace')::boolean, true) then v := btrim(v); end if;
  return v;
end;
$function$


CREATE OR REPLACE FUNCTION public.levenshtein_distance(p_a text, p_b text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare a text:=coalesce(p_a,''); b text:=coalesce(p_b,''); la int:=char_length(a); lb int:=char_length(b); prev int[]; cur int[]; i int; j int; cost int;
begin
  if la=0 then return lb; end if; if lb=0 then return la; end if;
  prev:=array_fill(0,array[lb+1]); for j in 0..lb loop prev[j+1]:=j; end loop;
  for i in 1..la loop
    cur:=array_fill(0,array[lb+1]); cur[1]:=i;
    for j in 1..lb loop
      cost:=case when substr(a,i,1)=substr(b,j,1) then 0 else 1 end;
      cur[j+1]:=least(cur[j]+1,prev[j+1]+1,prev[j]+cost);
    end loop;
    prev:=cur;
  end loop;
  return prev[lb+1];
end;
$function$


CREATE OR REPLACE FUNCTION public.validate_question_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin if new.is_published then perform public.validate_question_content(new.id,true); end if; return new; end; $function$


CREATE OR REPLACE FUNCTION public.validate_question_option_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare qid bigint;
begin
  qid:=case when tg_op='DELETE' then old.question_id else new.question_id end;
  if tg_op<>'DELETE' then
    if new.order_index<0 then raise exception 'OPTION_ORDER_INVALID'; end if;
    if new.correct_order is not null and new.correct_order<0 then raise exception 'CORRECT_ORDER_INVALID'; end if;
  end if;
  perform public.validate_question_content(qid,true);
  return case when tg_op='DELETE' then old else new end;
end; $function$


CREATE OR REPLACE FUNCTION public.ensure_gem_wallet(p_user_id uuid)
 RETURNS public.user_gems
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare w public.user_gems%rowtype;
begin
  insert into public.user_gems(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into w from public.user_gems where user_id=p_user_id for update;
  return w;
end;
$function$


CREATE OR REPLACE FUNCTION public.admin_duplicate_question(p_question_id bigint, p_new_lesson_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare s public.questions; nrow public.questions; target_lesson bigint; n int;
begin
  perform public.admin_require('content'); select * into s from public.questions where id=p_question_id;
  if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
  target_lesson:=coalesce(p_new_lesson_id,s.lesson_id);
  if not exists(select 1 from public.lessons where id=target_lesson) then raise exception 'TARGET_LESSON_NOT_FOUND'; end if;
  select coalesce(max(order_index),-1)+1 into n from public.questions where lesson_id=target_lesson;
  insert into public.questions(lesson_id,type,order_index,prompt,instruction,hint,explanation,image_url,target_text,target_translation,xp,difficulty,is_published,metadata,normalization_config,accepted_answers,audio_url,audio_text,audio_language,audio_speed,audio_config,speaking_config,fill_blank_config,word_bank_config,time_limit_seconds)
  values(target_lesson,s.type,n,s.prompt,s.instruction,s.hint,s.explanation,s.image_url,s.target_text,s.target_translation,s.xp,s.difficulty,false,s.metadata,s.normalization_config,s.accepted_answers,s.audio_url,s.audio_text,s.audio_language,s.audio_speed,s.audio_config,s.speaking_config,s.fill_blank_config,s.word_bank_config,s.time_limit_seconds)
  returning * into nrow;
  insert into public.question_options(question_id,text,image_url,audio_url,order_index,is_correct,correct_order,metadata)
  select nrow.id,text,image_url,audio_url,order_index,is_correct,correct_order,metadata from public.question_options where question_id=s.id;
  perform public.admin_audit('DUPLICATE','question',nrow.id::text,to_jsonb(s),public.admin_get_question(nrow.id)); return public.admin_get_question(nrow.id);
end; $function$


CREATE OR REPLACE FUNCTION public.ensure_daily_goal(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.user_daily_goals(user_id,goal_date) values(p_user_id,p_date) on conflict(user_id,goal_date) do nothing;
end;
$function$


CREATE OR REPLACE FUNCTION public.admin_get_shop_items()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$ begin perform public.admin_require('read'); return coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.shop_items s),'[]'::jsonb); end; $function$


CREATE OR REPLACE FUNCTION public.admin_set_achievement_active(p_achievement_id bigint, p_is_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare b public.achievements; a public.achievements;
begin perform public.admin_require('content'); select * into b from public.achievements where id=p_achievement_id for update; if not found then raise exception 'ACHIEVEMENT_NOT_FOUND'; end if; update public.achievements set is_active=p_is_active where id=p_achievement_id returning * into a; perform public.admin_audit('SET_ACTIVE','achievement',p_achievement_id::text,to_jsonb(b),to_jsonb(a)); return to_jsonb(a); end; $function$


CREATE OR REPLACE FUNCTION public.get_gem_wallet()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare u uuid:=auth.uid(); w public.user_gems%rowtype;
begin if u is null then raise exception 'AUTH_REQUIRED'; end if; w:=public.ensure_gem_wallet(u); return to_jsonb(w); end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_leagues()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$ begin perform public.admin_require('read'); return coalesce((select jsonb_agg(jsonb_build_object('league',to_jsonb(l),'weeks',(select count(*) from public.league_weeks w where w.league_id=l.id),'active_weeks',(select count(*) from public.league_weeks w where w.league_id=l.id and w.status='ACTIVE')) order by l.league_order) from public.leagues l),'[]'::jsonb); end; $function$


CREATE OR REPLACE FUNCTION public.validate_question_content(p_question_id bigint, p_require_published boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare q public.questions%rowtype; option_count int; correct_count int; ordered_count int; distinct_order_count int;
begin
  select * into q from public.questions where id=p_question_id;
  if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
  if p_require_published and not q.is_published then return; end if;
  if q.type in ('MCQ_SINGLE','MCQ_MULTI','WORD_BANK') then
    select count(*),count(*) filter(where is_correct),count(*) filter(where correct_order is not null),count(distinct correct_order) into option_count,correct_count,ordered_count,distinct_order_count from public.question_options where question_id=q.id;
    if option_count<2 then raise exception 'QUESTION_REQUIRES_AT_LEAST_TWO_OPTIONS'; end if;
    if q.type='MCQ_SINGLE' and correct_count<>1 then raise exception 'MCQ_SINGLE_REQUIRES_EXACTLY_ONE_CORRECT_OPTION'; end if;
    if q.type='MCQ_MULTI' and correct_count<1 then raise exception 'MCQ_MULTI_REQUIRES_AT_LEAST_ONE_CORRECT_OPTION'; end if;
    if q.type='WORD_BANK' then if ordered_count<>option_count then raise exception 'WORD_BANK_EVERY_OPTION_REQUIRES_CORRECT_ORDER'; end if; if ordered_count<>distinct_order_count then raise exception 'WORD_BANK_CORRECT_ORDER_MUST_BE_UNIQUE'; end if; end if;
  end if;
  if q.type in ('MCQ_SINGLE','MCQ_MULTI','FILL_BLANK','WORD_BANK','LISTENING','SPEAKING') and coalesce(length(trim(q.prompt)),0)=0 and q.type not in ('LISTENING','SPEAKING') then raise exception 'QUESTION_PROMPT_REQUIRED'; end if;
  if q.type in ('FILL_BLANK','LISTENING','SPEAKING') and coalesce(length(trim(q.target_text)),0)=0 then raise exception 'TEXT_QUESTION_REQUIRES_TARGET_TEXT'; end if;
  if q.type='LISTENING' and coalesce(length(trim(q.audio_url)),0)=0 then raise exception 'LISTENING_REQUIRES_AUDIO_URL'; end if;
  if q.type='SPEAKING' and coalesce(q.speaking_config->>'language','')='' then raise exception 'SPEAKING_LANGUAGE_REQUIRED'; end if;
  if q.type='SPEAKING' and (coalesce((q.speaking_config->>'similarity_threshold')::numeric,0.80) < 0 or coalesce((q.speaking_config->>'similarity_threshold')::numeric,0.80) > 1) then raise exception 'SPEAKING_SIMILARITY_THRESHOLD_INVALID'; end if;
  if jsonb_typeof(q.accepted_answers)<>'array' then raise exception 'ACCEPTED_ANSWERS_MUST_BE_ARRAY'; end if;
  if exists(select 1 from jsonb_array_elements(q.accepted_answers) x where jsonb_typeof(x) <> 'string') then raise exception 'ACCEPTED_ANSWERS_MUST_CONTAIN_STRINGS'; end if;
end; $function$


CREATE OR REPLACE FUNCTION public.safe_question(p_question_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select jsonb_build_object(
  'id',q.id,'type',q.type,'order_index',q.order_index,'prompt',q.prompt,'instruction',q.instruction,
  'hint',q.hint,'xp',q.xp,'difficulty',q.difficulty,'image_url',q.image_url,'audio_url',q.audio_url,
  'audio_language',q.audio_language,'audio_speed',q.audio_speed,'audio_config',q.audio_config,
  'speaking_config',jsonb_build_object('enabled',coalesce((q.speaking_config->>'enabled')::boolean,false),
    'language',q.speaking_config->>'language','max_recording_seconds',coalesce((q.speaking_config->>'max_recording_seconds')::int,10),
    'allow_retry',coalesce((q.speaking_config->>'allow_retry')::boolean,true)),
  'fill_blank_config',q.fill_blank_config,'word_bank_config',q.word_bank_config,
  'time_limit_seconds',q.time_limit_seconds,
  'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'text',o.text,'image_url',o.image_url,'audio_url',o.audio_url,'order_index',o.order_index,'metadata',o.metadata) order by o.order_index) from public.question_options o where o.question_id=q.id),'[]'::jsonb)
)
from public.questions q where q.id=p_question_id and q.is_published;
$function$


CREATE OR REPLACE FUNCTION public.build_correct_answer(p_question_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare q public.questions%rowtype; r jsonb;
begin
  select * into q from public.questions where id=p_question_id;
  if not found then return null; end if;
  case q.type
    when 'MCQ_SINGLE' then
      select jsonb_build_object('option_id',o.id,'text',o.text,'image_url',o.image_url) into r from public.question_options o where o.question_id=q.id and o.is_correct order by o.order_index limit 1;
    when 'MCQ_MULTI' then
      select jsonb_build_object('option_ids',coalesce(jsonb_agg(o.id order by o.order_index),'[]'::jsonb),'options',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'text',o.text,'image_url',o.image_url) order by o.order_index),'[]'::jsonb)) into r from public.question_options o where o.question_id=q.id and o.is_correct;
    when 'WORD_BANK' then
      select jsonb_build_object('option_ids',coalesce(jsonb_agg(o.id order by o.correct_order),'[]'::jsonb),'options',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'text',o.text,'image_url',o.image_url) order by o.correct_order),'[]'::jsonb)) into r from public.question_options o where o.question_id=q.id and o.correct_order is not null;
    when 'FILL_BLANK','LISTENING','SPEAKING' then r:=jsonb_build_object('text',q.target_text);
  end case;
  return r;
end;
$function$


CREATE OR REPLACE FUNCTION public.get_user_mistakes(p_limit integer DEFAULT 50)
 RETURNS SETOF public.user_mistakes
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select * from public.user_mistakes where user_id=auth.uid() order by updated_at desc limit greatest(1,least(p_limit,200)); $function$


CREATE OR REPLACE FUNCTION public.refresh_hearts(p_user_id uuid)
 RETURNS public.user_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  s public.user_stats%rowtype;
  now_ts timestamptz:=clock_timestamp();
  add_n int;
  elapsed_seconds bigint;
  intervals_to_apply int;
  new_regen_ts timestamptz;
  regen_key text;
begin
  select * into s from public.user_stats where user_id=p_user_id for update;
  if not found then raise exception 'USER_STATS_NOT_FOUND'; end if;
  if s.hearts >= s.max_hearts then
    return s;
  end if;
  elapsed_seconds:=greatest(0,floor(extract(epoch from (now_ts-coalesce(s.last_heart_regenerated_at,now_ts)))));
  intervals_to_apply:=floor(elapsed_seconds/1800)::int;
  add_n:=least(intervals_to_apply,s.max_hearts-s.hearts);
  if add_n>0 then
    new_regen_ts:=coalesce(s.last_heart_regenerated_at,now_ts)+(add_n*interval '30 minutes');
    if new_regen_ts>now_ts then new_regen_ts:=now_ts; end if;
    regen_key:='HEART_REGEN:'||p_user_id::text||':'||extract(epoch from new_regen_ts)::bigint::text;
    update public.user_stats set hearts=hearts+add_n,last_heart_regenerated_at=case when hearts+add_n>=max_hearts then now_ts else new_regen_ts end,updated_at=now() where user_id=p_user_id returning * into s;
    insert into public.heart_transactions(user_id,amount,reason,source_key,metadata)
    values(p_user_id,add_n,'TIME_REGEN',regen_key,jsonb_build_object('interval_seconds',1800,'intervals',add_n));
  end if;
  return s;
end;
$function$


CREATE OR REPLACE FUNCTION public.change_hearts(p_user_id uuid, p_amount integer, p_reason text, p_source_key text, p_question_id bigint DEFAULT NULL::bigint, p_lesson_id bigint DEFAULT NULL::bigint, p_question_attempt_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.user_stats%rowtype; existing public.heart_transactions%rowtype; applied int;
begin
  if p_amount=0 then raise exception 'HEART_AMOUNT_ZERO'; end if;
  if p_source_key is null then raise exception 'HEART_SOURCE_KEY_REQUIRED'; end if;
  select * into s from public.user_stats where user_id=p_user_id for update;
  if not found then raise exception 'USER_STATS_NOT_FOUND'; end if;
  select * into existing from public.heart_transactions where user_id=p_user_id and source_key=p_source_key limit 1;
  if found then return jsonb_build_object('amount',existing.amount,'hearts',s.hearts,'max_hearts',s.max_hearts,'idempotent',true); end if;
  if p_amount<0 then applied:=-least(-p_amount,s.hearts); else applied:=least(p_amount,s.max_hearts-s.hearts); end if;
  if applied<>0 then
    update public.user_stats set hearts=hearts+applied,last_heart_regenerated_at=case when applied<0 and hearts=max_hearts then clock_timestamp() when hearts+applied>=max_hearts then clock_timestamp() else last_heart_regenerated_at end,updated_at=now() where user_id=p_user_id returning * into s;
    insert into public.heart_transactions(user_id,amount,reason,question_id,lesson_id,question_attempt_id,source_key,metadata)
    values(p_user_id,applied,p_reason,p_question_id,p_lesson_id,p_question_attempt_id,p_source_key,coalesce(p_metadata,'{}'));
  end if;
  return jsonb_build_object('amount',applied,'hearts',s.hearts,'max_hearts',s.max_hearts,'idempotent',false);
end;
$function$


CREATE OR REPLACE FUNCTION public.grant_gems(p_user_id uuid, p_amount bigint, p_transaction_type text, p_reason text, p_source_type text, p_source_id text, p_source_key text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare w public.user_gems%rowtype; tx public.gem_transactions%rowtype; existing public.gem_transactions%rowtype;
begin
  if p_amount<=0 then raise exception 'GEM_AMOUNT_INVALID'; end if;
  if p_source_key is null then raise exception 'GEM_SOURCE_KEY_REQUIRED'; end if;
  w:=public.ensure_gem_wallet(p_user_id);
  -- Wallet is locked by ensure_gem_wallet before the idempotency check.
  select * into existing from public.gem_transactions where user_id=p_user_id and source_key=p_source_key limit 1;
  if found then return jsonb_build_object('awarded',existing.amount,'balance',w.balance,'transaction_id',existing.id,'idempotent',true); end if;
  update public.user_gems set balance=balance+p_amount,lifetime_earned=lifetime_earned+p_amount,updated_at=now() where user_id=p_user_id returning * into w;
  insert into public.gem_transactions(user_id,amount,transaction_type,reason,source_type,source_id,source_key,metadata)
  values(p_user_id,p_amount,p_transaction_type,p_reason,p_source_type,p_source_id,p_source_key,coalesce(p_metadata,'{}')) returning * into tx;
  return jsonb_build_object('awarded',p_amount,'balance',w.balance,'transaction_id',tx.id,'idempotent',false);
end;
$function$


CREATE OR REPLACE FUNCTION public.get_user_achievements()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'title',a.title,'description',a.description,'icon_url',a.icon_url,'requirement_type',a.requirement_type,'requirement_value',a.requirement_value,'progress',coalesce(ua.progress,0),'unlocked',coalesce(ua.unlocked,false),'unlocked_at',ua.unlocked_at) order by a.id),'[]'::jsonb) from public.achievements a left join public.user_achievements ua on ua.achievement_id=a.id and ua.user_id=auth.uid() where a.is_active; $function$


CREATE OR REPLACE FUNCTION public.admin_validate_content_tree(p_course_id bigint DEFAULT NULL::bigint, p_unit_id bigint DEFAULT NULL::bigint, p_lesson_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare errors jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb; r record; v jsonb;
begin
  perform public.admin_require('read');
  if p_course_id is not null and not exists(select 1 from public.courses where id=p_course_id) then raise exception 'COURSE_NOT_FOUND'; end if;
  if p_unit_id is not null and not exists(select 1 from public.units where id=p_unit_id) then raise exception 'UNIT_NOT_FOUND'; end if;
  if p_lesson_id is not null and not exists(select 1 from public.lessons where id=p_lesson_id) then raise exception 'LESSON_NOT_FOUND'; end if;
  for r in select l.id from public.lessons l join public.units u on u.id=l.unit_id
    where (p_course_id is null or u.course_id=p_course_id) and (p_unit_id is null or u.id=p_unit_id) and (p_lesson_id is null or l.id=p_lesson_id) loop
    if not exists(select 1 from public.questions q where q.lesson_id=r.id) then errors:=errors||jsonb_build_array(jsonb_build_object('lesson_id',r.id,'error','LESSON_HAS_NO_QUESTIONS')); end if;
  end loop;
  for r in select q.id from public.questions q join public.lessons l on l.id=q.lesson_id join public.units u on u.id=l.unit_id
    where (p_course_id is null or u.course_id=p_course_id) and (p_unit_id is null or u.id=p_unit_id) and (p_lesson_id is null or l.id=p_lesson_id) loop
    v:=public.admin_validate_question(r.id); if not (v->>'valid')::boolean then errors:=errors||jsonb_build_array(v); end if;
  end loop;
  return jsonb_build_object('valid',jsonb_array_length(errors)=0,'errors',errors,'warnings',warnings);
end; $function$


CREATE OR REPLACE FUNCTION public.spend_gems(p_user_id uuid, p_amount bigint, p_transaction_type text, p_reason text, p_source_type text, p_source_id text, p_source_key text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare w public.user_gems%rowtype; tx public.gem_transactions%rowtype; existing public.gem_transactions%rowtype;
begin
  if p_amount<=0 then raise exception 'GEM_AMOUNT_INVALID'; end if;
  if p_source_key is null then raise exception 'GEM_SOURCE_KEY_REQUIRED'; end if;
  w:=public.ensure_gem_wallet(p_user_id);
  select * into existing from public.gem_transactions where user_id=p_user_id and source_key=p_source_key limit 1;
  if found then return jsonb_build_object('spent',-existing.amount,'balance',w.balance,'transaction_id',existing.id,'idempotent',true); end if;
  if w.balance<p_amount then raise exception 'INSUFFICIENT_GEMS'; end if;
  update public.user_gems set balance=balance-p_amount,lifetime_spent=lifetime_spent+p_amount,updated_at=now() where user_id=p_user_id returning * into w;
  insert into public.gem_transactions(user_id,amount,transaction_type,reason,source_type,source_id,source_key,metadata)
  values(p_user_id,-p_amount,p_transaction_type,p_reason,p_source_type,p_source_id,p_source_key,coalesce(p_metadata,'{}')) returning * into tx;
  return jsonb_build_object('spent',p_amount,'balance',w.balance,'transaction_id',tx.id,'idempotent',false);
end;
$function$


CREATE OR REPLACE FUNCTION public.process_question_gamification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare d date:=new.created_at::date; streak int; prior_date date; prior_streak int; qcount int;
begin
  perform public.ensure_daily_goal(new.user_id,d);
  -- XP totals and daily XP are owned by the xp_transactions trigger.
  -- This trigger only counts answered questions, mistakes and meaningful streak activity.
  insert into public.user_daily_goals(user_id,goal_date,questions_completed) values(new.user_id,d,case when new.result<>'SKIPPED' then 1 else 0 end)
  on conflict(user_id,goal_date) do update set questions_completed=public.user_daily_goals.questions_completed+case when new.result <> 'SKIPPED' then 1 else 0 end,updated_at=now();

  insert into public.user_mistakes(user_id,question_id,mistake_count,correct_count,last_result,last_attempted_at,mastered)
  values(new.user_id,new.question_id,case when new.result in ('INCORRECT','TIMEOUT') then 1 else 0 end,case when new.result='CORRECT' then 1 else 0 end,new.result,new.created_at,false)
  on conflict(user_id,question_id) do update set
    mistake_count=public.user_mistakes.mistake_count+case when new.result in ('INCORRECT','TIMEOUT') then 1 else 0 end,
    correct_count=public.user_mistakes.correct_count+case when new.result='CORRECT' then 1 else 0 end,
    last_result=new.result,last_attempted_at=new.created_at,
    mastered=case when public.user_mistakes.correct_count+case when new.result='CORRECT' then 1 else 0 end>=3 then true else public.user_mistakes.mastered end,
    mastered_at=case when public.user_mistakes.correct_count+case when new.result='CORRECT' then 1 else 0 end>=3 and not public.user_mistakes.mastered then now() else public.user_mistakes.mastered_at end,
    updated_at=now();

  -- A streak day becomes active only after 5 answered questions.
  select questions_completed into qcount from public.user_daily_goals where user_id=new.user_id and goal_date=d;
  if qcount >= 5 then
    select activity_date,streak_number into prior_date,prior_streak from public.user_streak_days where user_id=new.user_id and activity_date < d order by activity_date desc limit 1;
    if exists(select 1 from public.user_streak_days where user_id=new.user_id and activity_date=d) then
      streak:=(select streak_number from public.user_streak_days where user_id=new.user_id and activity_date=d);
    elsif prior_date=d-1 then
      streak:=prior_streak+1;
    elsif prior_date=d-2 and exists(select 1 from public.user_stats where user_id=new.user_id and streak_freezes>0) then
      streak:=prior_streak+1;
      update public.user_stats set streak_freezes=streak_freezes-1,updated_at=now() where user_id=new.user_id and streak_freezes>0;
      insert into public.user_streak_freeze_transactions(user_id,amount,reason,source_key,metadata)
      values(new.user_id,-1,'STREAK_PROTECTION', 'STREAK_FREEZE:'||new.user_id::text||':'||d::text, jsonb_build_object('activity_date',d,'protected_gap_date',d-1))
      on conflict(user_id,source_key) do nothing;
    else
      streak:=1;
    end if;
    insert into public.user_streak_days(user_id,activity_date,questions_answered,correct_answers,xp_earned,streak_number)
    select new.user_id,d,count(*) filter(where result<>'SKIPPED'),count(*) filter(where result='CORRECT'),coalesce(sum(xp_awarded),0),streak from public.question_attempts where user_id=new.user_id and created_at::date=d
    on conflict(user_id,activity_date) do update set questions_answered=excluded.questions_answered,correct_answers=excluded.correct_answers,xp_earned=excluded.xp_earned,streak_number=greatest(public.user_streak_days.streak_number,excluded.streak_number);
    update public.user_stats set streak_days=streak,last_activity_date=d where user_id=new.user_id;
  end if;

  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.process_xp_gamification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare d date:=new.created_at::date; before_done boolean; after_done boolean;
begin
  insert into public.user_xp_daily(user_id,xp_date,xp_earned,question_xp,lesson_xp,bonus_xp,correction_xp)
  values(new.user_id,d,greatest(new.amount,0),case when new.type='QUESTION_XP' then greatest(new.amount,0) else 0 end,case when new.type='LESSON_COMPLETION' then greatest(new.amount,0) else 0 end,case when new.type='BONUS' then greatest(new.amount,0) else 0 end,case when new.type='CORRECTION' then greatest(new.amount,0) else 0 end)
  on conflict(user_id,xp_date) do update set xp_earned=public.user_xp_daily.xp_earned+greatest(new.amount,0),question_xp=public.user_xp_daily.question_xp+case when new.type='QUESTION_XP' then greatest(new.amount,0) else 0 end,lesson_xp=public.user_xp_daily.lesson_xp+case when new.type='LESSON_COMPLETION' then greatest(new.amount,0) else 0 end,bonus_xp=public.user_xp_daily.bonus_xp+case when new.type='BONUS' then greatest(new.amount,0) else 0 end,correction_xp=public.user_xp_daily.correction_xp+case when new.type='CORRECTION' then greatest(new.amount,0) else 0 end,updated_at=now();
  perform public.ensure_daily_goal(new.user_id,d);
  update public.user_daily_goals set xp_earned=xp_earned+case when new.type in ('QUESTION_XP','LESSON_COMPLETION') then greatest(new.amount,0) else 0 end,updated_at=now() where user_id=new.user_id and goal_date=d;
  if new.type='LESSON_COMPLETION' and new.lesson_id is not null then
    perform public.grant_gems(new.user_id,10,'LESSON_COMPLETION','Lesson completion reward','LESSON',new.lesson_id::text,'LESSON_COMPLETION:'||new.user_id::text||':'||new.lesson_id::text);
  end if;
  select completed into before_done from public.user_daily_goals where user_id=new.user_id and goal_date=d;
  update public.user_daily_goals set completed=(questions_completed>=questions_goal and xp_earned>=xp_goal),completed_at=case when questions_completed>=questions_goal and xp_earned>=xp_goal and not completed then now() else completed_at end,updated_at=now() where user_id=new.user_id and goal_date=d returning completed into after_done;
  if coalesce(before_done,false)=false and coalesce(after_done,false)=true then perform public.grant_gems(new.user_id,20,'DAILY_GOAL','Daily goal completed','DAILY_GOAL',d::text,'DAILY_GOAL:'||new.user_id::text||':'||d::text); end if;
  -- Positive XP earned during the active calendar week contributes to the league.
  if new.amount > 0 then
    perform public.ensure_current_league_membership(new.user_id);
    update public.league_members lm
       set weekly_xp=lm.weekly_xp+new.amount,updated_at=now()
      from public.league_weeks lw
     where lm.league_week_id=lw.id
       and lm.user_id=new.user_id
       and lw.status='ACTIVE'
       and current_date between lw.week_start and lw.week_end;
  end if;
  if not coalesce((new.metadata->>'skip_achievements')::boolean,false) then perform public.process_achievements(new.user_id); end if;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.process_achievements(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare a public.achievements%rowtype; val bigint; prog int;
begin
  for a in select * from public.achievements where is_active loop
    val:=case a.requirement_type
      when 'XP_TOTAL' then (select total_xp from public.user_stats where user_id=p_user_id)
      when 'QUESTIONS_TOTAL' then (select count(*) from public.question_attempts where user_id=p_user_id and result<>'SKIPPED')
      when 'CORRECT_TOTAL' then (select count(*) from public.question_attempts where user_id=p_user_id and result='CORRECT')
      when 'LESSONS_COMPLETED' then (select count(*) from public.user_lesson_progress where user_id=p_user_id and status='COMPLETED')
      when 'UNITS_COMPLETED' then (select count(*) from public.user_unit_progress where user_id=p_user_id and completed)
      when 'STREAK_DAYS' then (select streak_days from public.user_stats where user_id=p_user_id)
      when 'DAILY_GOALS_COMPLETED' then (select count(*) from public.user_daily_goals where user_id=p_user_id and completed)
      when 'GEMS_EARNED' then (select lifetime_earned from public.user_gems where user_id=p_user_id)
      else 0 end;
    prog:=least(a.requirement_value,val)::int;
    insert into public.user_achievements(user_id,achievement_id,progress) values(p_user_id,a.id,prog) on conflict(user_id,achievement_id) do update set progress=greatest(public.user_achievements.progress,prog),updated_at=now();
    if prog>=a.requirement_value and not exists(select 1 from public.user_achievements where user_id=p_user_id and achievement_id=a.id and unlocked) then
      update public.user_achievements set unlocked=true,unlocked_at=now(),updated_at=now() where user_id=p_user_id and achievement_id=a.id;
      if a.xp_reward>0 then perform public.grant_xp(p_user_id,a.xp_reward,'BONUS','ACHIEVEMENT:'||p_user_id::text||':'||a.id::text,null,null,null,'Achievement: '||a.title,jsonb_build_object('skip_achievements',true)); end if;
      if a.gem_reward>0 then perform public.grant_gems(p_user_id,a.gem_reward,'ACHIEVEMENT','Achievement: '||a.title,'ACHIEVEMENT',a.id::text,'ACHIEVEMENT:'||p_user_id::text||':'||a.id::text); end if;
    end if;
  end loop;
end;
$function$


CREATE OR REPLACE FUNCTION public.get_active_course_id(p_user_id uuid DEFAULT auth.uid())
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ begin if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if; if p_user_id<>auth.uid() and auth.role()<>'service_role' then raise exception 'FORBIDDEN'; end if; return (select uc.course_id from public.user_courses uc join public.courses c on c.id=uc.course_id where uc.user_id=p_user_id and uc.is_active and c.is_active order by uc.last_accessed_at desc limit 1); end; $function$


CREATE OR REPLACE FUNCTION public.start_lesson(p_lesson_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  u uuid := auth.uid();

  l public.lessons%ROWTYPE;
  q public.questions%ROWTYPE;
  a public.lesson_attempts%ROWTYPE;
  s public.user_stats%ROWTYPE;

  cnt integer;
  prev_lesson bigint;
  prev_unit bigint;
  lesson_course_id bigint;
BEGIN

  -- ============================================================
  -- AUTHENTICATION
  -- ============================================================

  IF u IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;


  -- ============================================================
  -- REFRESH HEARTS
  -- ============================================================

  s := public.refresh_hearts(u);

  IF s.hearts <= 0 THEN
    RAISE EXCEPTION 'NO_HEARTS';
  END IF;


  -- ============================================================
  -- LOAD LESSON
  -- ============================================================

  SELECT
    ls.*
  INTO l
  FROM public.lessons ls
  INNER JOIN public.units un
    ON un.id = ls.unit_id
  WHERE ls.id = p_lesson_id
    AND ls.is_published = true
    AND un.is_published = true
    AND un.course_id = public.get_active_course_id(u)
  LIMIT 1;


  -- ============================================================
  -- LESSON AVAILABILITY
  -- ============================================================

  IF l.id IS NULL THEN
    RAISE EXCEPTION 'LESSON_NOT_AVAILABLE';
  END IF;


  -- Get course ID once
  SELECT course_id
  INTO lesson_course_id
  FROM public.units
  WHERE id = l.unit_id;


  -- ============================================================
  -- UPDATE COURSE LAST ACCESS
  -- ============================================================

  UPDATE public.user_courses
  SET
    last_accessed_at = now(),
    updated_at = now()
  WHERE user_id = u
    AND course_id = lesson_course_id;


  -- ============================================================
  -- CHECK PREVIOUS UNIT
  -- ============================================================

  SELECT un.id
  INTO prev_unit
  FROM public.units un
  WHERE un.is_published = true
    AND un.course_id = lesson_course_id
    AND un.order_index < (
      SELECT order_index
      FROM public.units
      WHERE id = l.unit_id
    )
  ORDER BY un.order_index DESC
  LIMIT 1;


  IF prev_unit IS NOT NULL THEN

    IF NOT EXISTS (
      SELECT 1
      FROM public.user_unit_progress uup
      WHERE uup.user_id = u
        AND uup.unit_id = prev_unit
        AND uup.completed = true
    ) THEN
      RAISE EXCEPTION 'UNIT_LOCKED';
    END IF;

  END IF;


  -- ============================================================
  -- CHECK PREVIOUS LESSON
  -- ============================================================

  SELECT ls.id
  INTO prev_lesson
  FROM public.lessons ls
  WHERE ls.unit_id = l.unit_id
    AND ls.is_published = true
    AND ls.order_index < l.order_index
  ORDER BY ls.order_index DESC
  LIMIT 1;


  IF prev_lesson IS NOT NULL THEN

    IF NOT EXISTS (
      SELECT 1
      FROM public.user_lesson_progress ulp
      WHERE ulp.user_id = u
        AND ulp.lesson_id = prev_lesson
        AND ulp.status = 'COMPLETED'::public.lesson_status
    ) THEN
      RAISE EXCEPTION 'LESSON_LOCKED';
    END IF;

  END IF;


  -- ============================================================
  -- COUNT PUBLISHED QUESTIONS
  -- ============================================================

  SELECT count(*)
  INTO cnt
  FROM public.questions
  WHERE lesson_id = l.id
    AND is_published = true;


  IF cnt = 0 THEN
    RAISE EXCEPTION 'LESSON_HAS_NO_QUESTIONS';
  END IF;


  -- ============================================================
  -- CHECK EXISTING ACTIVE ATTEMPT
  -- ============================================================

  SELECT *
  INTO a
  FROM public.lesson_attempts
  WHERE user_id = u
    AND lesson_id = p_lesson_id
    AND status = 'ACTIVE'::public.lesson_attempt_status
  ORDER BY started_at DESC
  LIMIT 1
  FOR UPDATE;


  -- ============================================================
  -- RESUME EXISTING ATTEMPT
  -- ============================================================

  IF FOUND THEN

    -- Safety: if the attempt does not have a question,
    -- recover the first/current question.
    IF a.current_question_id IS NULL THEN

      SELECT *
      INTO q
      FROM public.questions
      WHERE lesson_id = p_lesson_id
        AND is_published = true
      ORDER BY order_index
      LIMIT 1;

      UPDATE public.lesson_attempts
      SET
        current_question_id = q.id,
        current_question_order = q.order_index,
        current_question_started_at = clock_timestamp(),
        updated_at = now()
      WHERE id = a.id
      RETURNING *
      INTO a;

    END IF;


    UPDATE public.user_lesson_progress
    SET
      status = 'IN_PROGRESS'::public.lesson_status,
      total_questions = cnt,
      current_question_order =
        COALESCE(a.current_question_order, 0),
      updated_at = now()
    WHERE user_id = u
      AND lesson_id = p_lesson_id;


    RETURN jsonb_build_object(
      'success', true,
      'resumed', true,

      'attempt_id', a.id,
      'lesson_id', p_lesson_id,

      'hearts', s.hearts,
      'max_hearts', s.max_hearts,

      'questions_seen', a.questions_seen,
      'questions_answered', a.questions_answered,

      'correct_answers', a.correct_answers,
      'incorrect_answers', a.incorrect_answers,

      'xp_earned', a.xp_earned,

      'question_count', cnt,

      'current_question_order',
        a.current_question_order,

      'question',
        public.safe_question(a.current_question_id)
    );

  END IF;


  -- ============================================================
  -- GET FIRST QUESTION
  -- ============================================================

  SELECT *
  INTO q
  FROM public.questions
  WHERE lesson_id = p_lesson_id
    AND is_published = true
  ORDER BY order_index
  LIMIT 1;


  IF q.id IS NULL THEN
    RAISE EXCEPTION 'LESSON_HAS_NO_QUESTIONS';
  END IF;


  -- ============================================================
  -- CREATE NEW LESSON ATTEMPT
  -- ============================================================

  INSERT INTO public.lesson_attempts (
    user_id,
    lesson_id,
    status,
    starting_hearts,
    current_question_id,
    current_question_order,
    current_question_started_at
  )
  VALUES (
    u,
    p_lesson_id,
    'ACTIVE'::public.lesson_attempt_status,
    s.hearts,
    q.id,
    q.order_index,
    clock_timestamp()
  )
  RETURNING *
  INTO a;


  -- ============================================================
  -- CREATE / UPDATE USER LESSON PROGRESS
  -- ============================================================

  INSERT INTO public.user_lesson_progress (
    user_id,
    lesson_id,
    status,
    current_question_order,
    total_questions,
    total_attempts
  )
  VALUES (
    u,
    p_lesson_id,
    'IN_PROGRESS'::public.lesson_status,
    q.order_index,
    cnt,
    1
  )

  ON CONFLICT (user_id, lesson_id)
  DO UPDATE
  SET

    status =
      CASE
        WHEN public.user_lesson_progress.status =
          'COMPLETED'::public.lesson_status
        THEN
          'COMPLETED'::public.lesson_status

        ELSE
          'IN_PROGRESS'::public.lesson_status
      END,

    current_question_order =
      CASE
        WHEN public.user_lesson_progress.status =
          'COMPLETED'::public.lesson_status
        THEN
          public.user_lesson_progress.current_question_order

        ELSE
          q.order_index
      END,

    total_questions = cnt,

    total_attempts =
      public.user_lesson_progress.total_attempts + 1,

    updated_at = now();


  -- ============================================================
  -- RETURN NEW ATTEMPT
  -- ============================================================

  RETURN jsonb_build_object(
    'success', true,
    'resumed', false,

    'attempt_id', a.id,
    'lesson_id', p_lesson_id,

    'hearts', s.hearts,
    'max_hearts', s.max_hearts,

    'questions_seen', 0,
    'questions_answered', 0,

    'correct_answers', 0,
    'incorrect_answers', 0,

    'xp_earned', 0,

    'question_count', cnt,

    'current_question_order',
      q.order_index,

    'question',
      public.safe_question(q.id)
  );

END;
$function$


CREATE OR REPLACE FUNCTION public.admin_get_course(p_course_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$declare
  v jsonb;
  v_total bigint;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
begin
  perform public.admin_require('read');

  select count(*)
  into v_total
  from public.units u
  where u.course_id = p_course_id;

  select jsonb_build_object(
    'course', to_jsonb(c),
    'units', coalesce(
      (
        select jsonb_agg(to_jsonb(u) order by u.order_index, u.id)
        from public.units u
        where u.course_id = c.id
        order by u.order_index, u.id
        limit v_page_size
        offset (v_page - 1) * v_page_size
      ),
      '[]'::jsonb
    ),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_items', v_total,
      'total_pages', ceil(v_total::numeric / v_page_size)::integer,
      'has_more', v_page::bigint * v_page_size < v_total
    )
  )
  into v
  from public.courses c
  where c.id = p_course_id;

  if v is null then
    raise exception 'COURSE_NOT_FOUND';
  end if;

  return v;
end;$function$


CREATE OR REPLACE FUNCTION public.get_gem_transactions(p_limit integer DEFAULT 50)
 RETURNS SETOF public.gem_transactions
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select * from public.gem_transactions where user_id=auth.uid() order by created_at desc limit greatest(1,least(p_limit,200));
$function$


CREATE OR REPLACE FUNCTION public.get_league_leaderboard()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select coalesce((select jsonb_agg(to_jsonb(r) order by r.rank,r.user_id) from (select row_number() over(order by lm.weekly_xp desc,lm.user_id) rank,lm.user_id,lm.weekly_xp,lm.promoted,lm.demoted from public.league_members lm join public.league_weeks lw on lw.id=lm.league_week_id where lw.status='ACTIVE' and current_date between lw.week_start and lw.week_end and exists(select 1 from public.league_members me where me.league_week_id=lm.league_week_id and me.user_id=auth.uid())) r),'[]'::jsonb);
$function$


CREATE OR REPLACE FUNCTION public.rollover_league_week(p_league_week_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  old_week public.league_weeks%rowtype;
  target public.leagues%rowtype;
  new_week public.league_weeks%rowtype;
  m record;
  next_start date;
  next_end date;
  promo_count int;
  demote_count int;
  member_count int;
  moved int:=0;
  promoted int:=0;
  demoted int:=0;
begin
  select * into old_week from public.league_weeks where id=p_league_week_id for update;
  if not found then raise exception 'LEAGUE_WEEK_NOT_FOUND'; end if;
  if old_week.status='ACTIVE' and current_date <= old_week.week_end then raise exception 'LEAGUE_WEEK_NOT_ENDED'; end if;
  if old_week.status='ACTIVE' then perform public.finalize_league_week(p_league_week_id); select * into old_week from public.league_weeks where id=p_league_week_id; end if;

  next_start:=old_week.week_end+1; next_end:=next_start+6;
  select count(*) into member_count from public.league_members where league_week_id=old_week.id;
  promo_count:=case when member_count>=5 then greatest(1,floor(member_count*0.2)::int) else 0 end;
  demote_count:=case when member_count>=10 then greatest(1,floor(member_count*0.2)::int) else 0 end;

  for m in select lm.*,row_number() over(order by lm.weekly_xp desc,lm.user_id) as r from public.league_members lm where lm.league_week_id=old_week.id order by lm.weekly_xp desc,lm.user_id loop
    select * into target from public.leagues where is_active and league_order=
      greatest(0,least((select max(league_order) from public.leagues where is_active),(select league_order from public.leagues where id=old_week.league_id)+case when promo_count>0 and m.r<=promo_count then 1 when demote_count>0 and m.r>member_count-demote_count then -1 else 0 end))
      order by league_order limit 1;
    insert into public.league_weeks(league_id,week_start,week_end,status)
    values(target.id,next_start,next_end,'ACTIVE')
    on conflict(league_id,next_start) do update set week_end=excluded.week_end
    returning * into new_week;
    insert into public.league_members(league_week_id,user_id) values(new_week.id,m.user_id) on conflict(league_week_id,user_id) do nothing;
    moved:=moved+1;
    if promo_count>0 and m.r<=promo_count and target.id<>old_week.league_id then promoted:=promoted+1; end if;
    if demote_count>0 and m.r>member_count-demote_count and target.id<>old_week.league_id then demoted:=demoted+1; end if;
  end loop;
  return jsonb_build_object('success',true,'from_week',old_week.id,'next_week_start',next_start,'members_moved',moved,'promoted',promoted,'demoted',demoted);
end;
$function$


CREATE OR REPLACE FUNCTION public.buy_shop_item(p_item_id bigint, p_quantity integer DEFAULT 1, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  v_user_id uuid := auth.uid();

  v_item public.shop_items%rowtype;

  v_quantity integer;
  v_total_cost bigint;

  v_balance bigint := 0;

  v_current_hearts integer;
  v_max_hearts integer;

  v_boost_multiplier numeric := 1;
  v_boost_duration_minutes integer := 30;

  v_boost_until timestamptz;
  v_new_boost_until timestamptz;

  v_existing_purchase public.shop_purchases%rowtype;

  v_purchase_id uuid;

  v_item_type text;
  v_item_code text;

begin

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  /*
   * Validate quantity.
   */
  v_quantity := coalesce(p_quantity, 1);

  if v_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  /*
   * Prevent absurd requests.
   */
  if v_quantity > 100 then
    raise exception 'QUANTITY_TOO_LARGE';
  end if;

  /*
   * Request ID is used for idempotency.
   */
  if p_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  /*
   * If this request was already processed,
   * return the previous purchase.
   */
  select *
  into v_existing_purchase
  from public.shop_purchases
  where user_id = v_user_id
    and request_id = p_request_id
  limit 1;

  if found then

    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'purchase_id', v_existing_purchase.id,
      'item_id', v_existing_purchase.shop_item_id,
      'quantity', v_existing_purchase.quantity,
      'total_cost', v_existing_purchase.total_cost
    );

  end if;

  /*
   * Lock shop item.
   */
  select *
  into v_item
  from public.shop_items
  where id = p_item_id
    and is_active = true
  for update;

  if not found then
    raise exception 'SHOP_ITEM_NOT_FOUND';
  end if;

  if v_item.gem_price < 0 then
    raise exception 'INVALID_ITEM_PRICE';
  end if;

  v_item_type := upper(coalesce(v_item.item_type, ''));
  v_item_code := upper(coalesce(v_item.code, ''));

  /*
   * Calculate total cost.
   */
  v_total_cost :=
    v_item.gem_price * v_quantity;

  /*
   * Lock the user's gem wallet indirectly by locking
   * the most recent transaction row if available.
   *
   * The actual spend is handled atomically below.
   */

  select coalesce(sum(gt.amount), 0)
  into v_balance
  from public.gem_transactions gt
  where gt.user_id = v_user_id;

  if v_balance < v_total_cost then
    raise exception 'INSUFFICIENT_GEMS';
  end if;

  /*
   * ==========================================================
   * SPEND GEMS
   * ==========================================================
   *
   * Do this inside the same transaction.
   */
  if v_total_cost > 0 then

PERFORM public.spend_gems(
  v_user_id,
  v_total_cost,
  'SHOP_PURCHASE',
  'Shop purchase: ' || v_item.code,
  'SHOP_ITEM',
  v_item.id::text,
  'SHOP_PURCHASE:' || p_request_id::text,
  jsonb_build_object(
    'source', 'SHOP_PURCHASE',
    'item_id', v_item.id,
    'item_code', v_item.code,
    'request_id', p_request_id,
    'quantity', p_quantity,
    'total_cost', v_total_cost
  )
);

  end if;

  /*
   * ==========================================================
   * APPLY ITEM
   * ==========================================================
   */

  /*
   * HEARTS
   *
   * item.quantity = number of hearts granted per unit.
   */
  if v_item_type = 'HEARTS' then

    select
      hearts,
      max_hearts
    into
      v_current_hearts,
      v_max_hearts
    from public.user_stats
    where user_id = v_user_id
    for update;

    if not found then
      raise exception 'USER_STATS_NOT_FOUND';
    end if;

    update public.user_stats
    set
      hearts =
        least(
          max_hearts,
          hearts + (v_item.quantity * v_quantity)
        ),
      updated_at = now()
    where user_id = v_user_id;

  /*
   * STREAK FREEZE
   */
  elsif v_item_type = 'STREAK_FREEZE' then

    update public.user_stats
    set
      streak_freezes =
        streak_freezes
        + (v_item.quantity * v_quantity),
      updated_at = now()
    where user_id = v_user_id;

  /*
   * XP BOOST
   */
  elsif v_item_type = 'XP_BOOST' then

    /*
     * Read metadata.
     *
     * Expected:
     *
     * {
     *   "multiplier": 2,
     *   "duration_minutes": 30
     * }
     */
    v_boost_multiplier :=
      coalesce(
        nullif(
          v_item.metadata->>'multiplier',
          ''
        )::numeric,
        2
      );

    v_boost_duration_minutes :=
      coalesce(
        nullif(
          v_item.metadata->>'duration_minutes',
          ''
        )::integer,
        30
      );

    if v_boost_multiplier <= 1 then
      raise exception 'INVALID_XP_BOOST_MULTIPLIER';
    end if;

    if v_boost_duration_minutes <= 0 then
      raise exception 'INVALID_XP_BOOST_DURATION';
    end if;

    /*
     * Lock user stats.
     */
    select xp_boost_until
    into v_boost_until
    from public.user_stats
    where user_id = v_user_id
    for update;

    if not found then
      raise exception 'USER_STATS_NOT_FOUND';
    end if;

    /*
     * If a boost is already active, extend it.
     *
     * Example:
     *
     * current boost = 20 minutes remaining
     * purchase = 30 minutes
     *
     * new expiry = current expiry + 30 minutes
     */
    if v_boost_until is not null
       and v_boost_until > now() then

      v_new_boost_until :=
        v_boost_until
        + make_interval(
            mins => v_boost_duration_minutes * v_quantity
          );

    else

      v_new_boost_until :=
        now()
        + make_interval(
            mins => v_boost_duration_minutes * v_quantity
          );

    end if;

    update public.user_stats
    set
      xp_boost_until = v_new_boost_until,
      xp_boost_multiplier =
        greatest(
          coalesce(xp_boost_multiplier, 1),
          v_boost_multiplier
        ),
      updated_at = now()
    where user_id = v_user_id;

  else

    raise exception
      'UNSUPPORTED_SHOP_ITEM_TYPE:%',
      v_item.item_type;

  end if;

  /*
   * ==========================================================
   * RECORD PURCHASE
   * ==========================================================
   */
  insert into public.shop_purchases (
    user_id,
    shop_item_id,
    quantity,
    total_cost,
    request_id
  )
  values (
    v_user_id,
    v_item.id,
    v_quantity,
    v_total_cost,
    p_request_id
  )
  returning id
  into v_purchase_id;

  /*
   * ==========================================================
   * RETURN CURRENT STATE
   * ==========================================================
   */
  select coalesce(sum(gt.amount), 0)
  into v_balance
  from public.gem_transactions gt
  where gt.user_id = v_user_id;

  select
    xp_boost_until,
    coalesce(xp_boost_multiplier, 1)
  into
    v_boost_until,
    v_boost_multiplier
  from public.user_stats
  where user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'already_processed', false,

    'purchase_id', v_purchase_id,

    'item_id', v_item.id,
    'item_code', v_item.code,
    'item_type', v_item.item_type,

    'quantity', v_quantity,
    'unit_price', v_item.gem_price,
    'total_cost', v_total_cost,

    'remaining_gems', v_balance,

    'xp_boost',
      jsonb_build_object(
        'active',
          (
            v_boost_until is not null
            and v_boost_until > now()
            and v_boost_multiplier > 1
          ),
        'multiplier',
          case
            when v_boost_until is not null
             and v_boost_until > now()
            then v_boost_multiplier
            else 1
          end,
        'until',
          case
            when v_boost_until is not null
             and v_boost_until > now()
            then v_boost_until
            else null
          end
      )
  );

end;$function$


CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.sync_profile_courses()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.native_language_id IS NULL OR NEW.target_language_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.user_courses
  SET is_active = false,
      updated_at = now()
  WHERE user_id = NEW.id;

  INSERT INTO public.user_courses (user_id, course_id, is_active)
  SELECT NEW.id, c.id, true
  FROM public.courses AS c
  WHERE c.source_language = NEW.native_language_id
    AND c.target_language = NEW.target_language_id
    AND c.is_active = true
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET is_active = true,
        last_accessed_at = now(),
        updated_at = now();

  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN

  -- ----------------------------------------------------------
  -- CREATE USER PROFILE
  -- ----------------------------------------------------------

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,

    NULLIF(
      NEW.raw_user_meta_data ->> 'username',
      ''
    ),

    COALESCE(
      NULLIF(
        NEW.raw_user_meta_data ->> 'full_name',
        ''
      ),
      NULLIF(
        NEW.raw_user_meta_data ->> 'name',
        ''
      )
    ),

    NULLIF(
      NEW.raw_user_meta_data ->> 'avatar_url',
      ''
    )
  )
  ON CONFLICT (id) DO NOTHING;


  -- ----------------------------------------------------------
  -- CREATE INITIAL USER STATE / STATS
  -- ----------------------------------------------------------

  INSERT INTO public.user_stats (
    user_id,
    hearts,
    max_hearts,
    last_heart_regenerated_at
  )
  VALUES (
    NEW.id,
    5,
    5,
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;


  RETURN NEW;

END;
$function$


CREATE OR REPLACE FUNCTION public.save_user_course_setup(p_course_code text, p_native_language_id text, p_target_language_id text, p_daily_goal_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid;
  v_course_id bigint;
  v_unit_id bigint;
  v_lesson_id bigint;
  v_total_questions integer := 0;
BEGIN

  -- ============================================================
  -- AUTH
  -- ============================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;


  -- ============================================================
  -- INPUT VALIDATION
  -- ============================================================

  IF p_course_code IS NULL
     OR trim(p_course_code) = '' THEN
    RAISE EXCEPTION 'COURSE_CODE_REQUIRED';
  END IF;

  IF p_native_language_id IS NULL
     OR trim(p_native_language_id) = '' THEN
    RAISE EXCEPTION 'NATIVE_LANGUAGE_REQUIRED';
  END IF;

  IF p_target_language_id IS NULL
     OR trim(p_target_language_id) = '' THEN
    RAISE EXCEPTION 'TARGET_LANGUAGE_REQUIRED';
  END IF;

  IF p_daily_goal_minutes IS NULL
     OR p_daily_goal_minutes <= 0 THEN
    RAISE EXCEPTION 'INVALID_DAILY_GOAL';
  END IF;


  -- ============================================================
  -- FIND COURSE
  --
  -- Frontend sends:
  --     "hi-en"
  --
  -- Database:
  --     courses.code = "hi-en"
  --     courses.id   = numeric PK
  -- ============================================================

  SELECT c.id
  INTO v_course_id
  FROM public.courses AS c
  WHERE c.code = trim(p_course_code)
    AND c.is_active = true
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'COURSE_NOT_FOUND';
  END IF;


  -- ============================================================
  -- VALIDATE NATIVE LANGUAGE
  -- ============================================================

  IF NOT EXISTS (
    SELECT 1
    FROM public.native_languages AS nl
    WHERE nl.id = p_native_language_id
  ) THEN
    RAISE EXCEPTION 'NATIVE_LANGUAGE_NOT_FOUND';
  END IF;


  -- ============================================================
  -- VALIDATE TARGET LANGUAGE
  -- ============================================================

  IF NOT EXISTS (
    SELECT 1
    FROM public.target_languages AS tl
    WHERE tl.id = p_target_language_id
  ) THEN
    RAISE EXCEPTION 'TARGET_LANGUAGE_NOT_FOUND';
  END IF;


  -- ============================================================
  -- PROFILE MUST EXIST
  -- ============================================================

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
  ) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;


  -- ============================================================
  -- UPDATE PROFILE
  -- ============================================================

  UPDATE public.profiles
  SET
    native_language_id = p_native_language_id,
    target_language_id = p_target_language_id,
    daily_goal_minutes = p_daily_goal_minutes
  WHERE id = v_user_id;


  -- ============================================================
  -- DEACTIVATE PREVIOUS ACTIVE COURSE
  -- ============================================================

  UPDATE public.user_courses
  SET
    is_active = false,
    updated_at = now()
  WHERE user_id = v_user_id
    AND is_active = true;


  -- ============================================================
  -- CREATE / REACTIVATE SELECTED COURSE
  -- ============================================================

  INSERT INTO public.user_courses (
    user_id,
    course_id,
    is_active,
    last_accessed_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_course_id,
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET
    is_active = true,
    last_accessed_at = now(),
    updated_at = now();


  -- ============================================================
  -- FIND FIRST PUBLISHED UNIT
  -- ============================================================

  SELECT u.id
  INTO v_unit_id
  FROM public.units AS u
  WHERE u.course_id = v_course_id
    AND u.is_published = true
  ORDER BY
    u.order_index ASC,
    u.id ASC
  LIMIT 1;

  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'COURSE_HAS_NO_PUBLISHED_UNITS';
  END IF;


  -- ============================================================
  -- UNLOCK FIRST UNIT
  -- ============================================================

  INSERT INTO public.user_unit_progress (
    user_id,
    unit_id,
    unlocked
  )
  VALUES (
    v_user_id,
    v_unit_id,
    true
  )
  ON CONFLICT (user_id, unit_id)
  DO UPDATE SET
    unlocked = true,
    updated_at = now();


  -- ============================================================
  -- FIND FIRST PUBLISHED LESSON
  -- ============================================================

  SELECT l.id
  INTO v_lesson_id
  FROM public.lessons AS l
  WHERE l.unit_id = v_unit_id
    AND l.is_published = true
  ORDER BY
    l.order_index ASC,
    l.id ASC
  LIMIT 1;

  IF v_lesson_id IS NULL THEN
    RAISE EXCEPTION 'FIRST_UNIT_HAS_NO_PUBLISHED_LESSONS';
  END IF;


  -- ============================================================
  -- COUNT QUESTIONS
  -- ============================================================

  SELECT count(*)
  INTO v_total_questions
  FROM public.questions AS q
  WHERE q.lesson_id = v_lesson_id
    AND q.is_published = true;


  -- ============================================================
  -- CREATE / INITIALIZE FIRST LESSON PROGRESS
  --
  -- IMPORTANT:
  -- lesson.status is lesson_status enum.
  -- Explicit enum casts are required.
  -- ============================================================

  INSERT INTO public.user_lesson_progress (
    user_id,
    lesson_id,
    status,
    total_questions,
    current_question_order
  )
  VALUES (
    v_user_id,
    v_lesson_id,
    'AVAILABLE'::lesson_status,
    v_total_questions,
    0
  )
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    status = CASE
      WHEN public.user_lesson_progress.status =
           'COMPLETED'::lesson_status
        THEN 'COMPLETED'::lesson_status
      ELSE
        'AVAILABLE'::lesson_status
    END,
    total_questions = EXCLUDED.total_questions,
    updated_at = now();


  -- ============================================================
  -- RETURN RESULT
  -- ============================================================

  RETURN jsonb_build_object(
    'success', true,
    'course_id', v_course_id,
    'course_code', trim(p_course_code),
    'native_language_id', p_native_language_id,
    'target_language_id', p_target_language_id,
    'daily_goal_minutes', p_daily_goal_minutes,
    'first_unit_id', v_unit_id,
    'first_lesson_id', v_lesson_id,
    'total_questions', v_total_questions
  );

END;
$function$


CREATE OR REPLACE FUNCTION public.get_active_user_course()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN

  -- ============================================================
  -- AUTH
  -- ============================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;


  -- ============================================================
  -- GET ACTIVE COURSE
  -- ============================================================

  SELECT jsonb_build_object(

    -- Frontend course ID
    'courseId',
    c.code,

    -- Frontend course slug
    'courseSlug',
    lower(
      regexp_replace(
        trim(c.source_language),
        '\s+',
        '-',
        'g'
      )
      || '-to-' ||
      regexp_replace(
        trim(c.target_language),
        '\s+',
        '-',
        'g'
      )
    ),

    -- Native / source language
    'fromLanguageId',
    nl.id,

    'fromLanguageCode',
    nl.code,

    'fromLanguageName',
    nl.name,

    -- Target language
    'targetLanguageId',
    tl.id,

    'targetLanguageCode',
    tl.code,

    'targetLanguageName',
    tl.name,

    -- Existing selection timestamp
    'selectedAt',
    uc.last_accessed_at

  )
  INTO v_result

  FROM public.user_courses uc

  JOIN public.courses c
    ON c.id = uc.course_id

  LEFT JOIN public.native_languages nl
    ON nl.id = c.source_language

  LEFT JOIN public.target_languages tl
    ON tl.id = c.target_language

  WHERE uc.user_id = v_user_id
    AND uc.is_active = true
    AND c.is_active = true

  ORDER BY uc.last_accessed_at DESC

  LIMIT 1;


  -- ============================================================
  -- NO ACTIVE COURSE
  -- ============================================================

  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'hasActiveCourse', false,
      'course', null
    );
  END IF;


  -- ============================================================
  -- RETURN
  -- ============================================================

  RETURN jsonb_build_object(
    'hasActiveCourse', true,
    'course', v_result
  );

END;
$function$


CREATE OR REPLACE FUNCTION public.get_user_stats()
 RETURNS TABLE(streak integer, gems bigint, coins bigint, lives integer, level integer, xp bigint, xp_max integer, today_minutes integer, goal_minutes integer)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select
    coalesce(us.streak_days, 0)::integer as streak,
    coalesce(ug.balance, 0)::bigint as gems,
    0::bigint as coins,
    coalesce(us.hearts, 5)::integer as lives,
    greatest(1, floor(coalesce(us.total_xp, 0)::numeric / 100)::integer + 1) as level,
    coalesce(us.total_xp, 0)::bigint as xp,
    600::integer as xp_max,
    0::integer as today_minutes,
    coalesce(p.daily_goal_minutes, 10)::integer as goal_minutes
  from (select (select auth.uid()) as user_id) as viewer
  left join public.user_stats as us
    on us.user_id = viewer.user_id
  left join public.user_gems as ug
    on ug.user_id = viewer.user_id
  left join public.profiles as p
    on p.id = viewer.user_id
  where viewer.user_id is not null;
$function$


CREATE OR REPLACE FUNCTION public.is_daily_xp_available()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_xp_daily AS d
       WHERE d.user_id = auth.uid()
         AND d.xp_date = (now() AT TIME ZONE 'UTC')::date
     );
$function$


CREATE OR REPLACE FUNCTION public.ensure_current_league_membership(p_user_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_today_utc date := (now() at time zone 'UTC')::date;

  v_week_start date;
  v_week_end date;

  v_current_week_id bigint;
  v_target_week_id bigint;

  v_lowest_league_id bigint;

  v_previous_league_id bigint;
  v_previous_league_order integer;

  v_target_league_id bigint;
  v_target_league_order integer;

  v_was_promoted boolean := false;
  v_was_demoted boolean := false;

  v_min_order integer;
  v_max_order integer;

begin

  /*
   * ============================================================
   * 1. VALIDATE USER
   * ============================================================
   */

  if p_user_id is null then
    raise exception 'USER_REQUIRED';
  end if;


  /*
   * ============================================================
   * 2. CALCULATE CURRENT UTC WEEK
   *
   * Monday -> Sunday
   * ============================================================
   */

  v_week_start :=
    v_today_utc
    - (extract(isodow from v_today_utc)::integer - 1);

  v_week_end := v_week_start + 6;


  /*
   * ============================================================
   * 3. GET ACTIVE LEAGUE RANGE
   * ============================================================
   */

  select
    min(league_order),
    max(league_order)
  into
    v_min_order,
    v_max_order
  from public.leagues
  where is_active = true;


  if v_min_order is null then
    raise exception 'NO_ACTIVE_LEAGUE';
  end if;


  /*
   * ============================================================
   * 4. CHECK WHETHER USER ALREADY HAS CURRENT MEMBERSHIP
   * ============================================================
   *
   * IMPORTANT:
   *
   * If the user already belongs to the current week,
   * NEVER create another membership.
   */

  select lm.league_week_id
  into v_current_week_id

  from public.league_members lm

  join public.league_weeks lw
    on lw.id = lm.league_week_id

  where lm.user_id = p_user_id

    and lw.status = 'ACTIVE'

    and lw.week_start = v_week_start

    and lw.week_end = v_week_end

  order by lw.id desc

  limit 1;


  if v_current_week_id is not null then

    return v_current_week_id;

  end if;


  /*
   * ============================================================
   * 5. FIND USER'S MOST RECENT PREVIOUS MEMBERSHIP
   * ============================================================
   *
   * We deliberately look at history instead of automatically
   * sending the user to Bronze.
   */

  select
    lw.league_id,
    l.league_order,
    lm.promoted,
    lm.demoted

  into
    v_previous_league_id,
    v_previous_league_order,
    v_was_promoted,
    v_was_demoted

  from public.league_members lm

  join public.league_weeks lw
    on lw.id = lm.league_week_id

  join public.leagues l
    on l.id = lw.league_id

  where lm.user_id = p_user_id

    and lw.status = 'FINALIZED'

    and lw.week_end < v_week_start

  order by
    lw.week_end desc,
    lw.id desc

  limit 1;


  /*
   * ============================================================
   * 6. DETERMINE TARGET LEAGUE
   * ============================================================
   *
   * Existing user:
   *
   * promoted -> +1
   * demoted  -> -1
   * same     -> same
   *
   * Completely new user:
   *
   * lowest league
   */


  if v_previous_league_id is null then

    /*
     * BRAND NEW USER
     */
    select id
    into v_target_league_id

    from public.leagues

    where is_active = true
      and league_order = v_min_order

    order by id

    limit 1;


  else

    /*
     * EXISTING USER
     */

    if v_was_promoted then

      v_target_league_order :=
        least(
          v_previous_league_order + 1,
          v_max_order
        );

    elsif v_was_demoted then

      v_target_league_order :=
        greatest(
          v_previous_league_order - 1,
          v_min_order
        );

    else

      v_target_league_order :=
        v_previous_league_order;

    end if;


    /*
     * Find actual active league ID.
     */
    select id
    into v_target_league_id

    from public.leagues

    where is_active = true
      and league_order = v_target_league_order

    order by id

    limit 1;


    /*
     * Safety fallback.
     */
    if v_target_league_id is null then

      select id
      into v_target_league_id

      from public.leagues

      where is_active = true
        and league_order = v_min_order

      order by id

      limit 1;

    end if;

  end if;


  if v_target_league_id is null then
    raise exception 'TARGET_LEAGUE_NOT_FOUND';
  end if;


  /*
   * ============================================================
   * 7. CREATE / GET CURRENT WEEK FOR TARGET LEAGUE
   * ============================================================
   *
   * This guarantees that the league week exists even if the
   * rollover job was late or missed.
   */

  select lw.id
  into v_target_week_id

  from public.league_weeks lw

  where lw.league_id = v_target_league_id

    and lw.week_start = v_week_start

  order by lw.id desc

  limit 1;


  if v_target_week_id is null then

    insert into public.league_weeks (
      league_id,
      week_start,
      week_end,
      status
    )

    values (
      v_target_league_id,
      v_week_start,
      v_week_end,
      'ACTIVE'
    )

    returning id into v_target_week_id;

  else

    /*
     * Make sure an existing row is active for this week.
     */

    update public.league_weeks

    set
      week_end = v_week_end,
      status = 'ACTIVE'

    where id = v_target_week_id;

  end if;


  /*
   * ============================================================
   * 8. ADD USER TO CORRECT LEAGUE
   * ============================================================
   *
   * New week's XP starts at zero.
   */

  insert into public.league_members (
    league_week_id,
    user_id,
    weekly_xp,
    rank,
    promoted,
    demoted,
    reward_gems
  )

  values (
    v_target_week_id,
    p_user_id,
    0,
    null,
    false,
    false,
    0
  )

  on conflict (
    league_week_id,
    user_id
  )

  do nothing;


  /*
   * ============================================================
   * 9. RETURN CURRENT LEAGUE WEEK
   * ============================================================
   */

  return v_target_week_id;

end;
$function$


CREATE OR REPLACE FUNCTION public.submit_question_answer(p_user_id uuid, p_attempt_id uuid, p_question_id bigint, p_answer_payload jsonb, p_request_id uuid DEFAULT gen_random_uuid(), p_speaking_transcript text DEFAULT NULL::text, p_speaking_similarity numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$



declare

  -- ==========================================================
  -- USER / TIME
  -- ==========================================================

  v_user_id uuid := p_user_id;
  v_now timestamptz := clock_timestamp();

  -- ==========================================================
  -- ROWS
  -- ==========================================================

  v_attempt public.lesson_attempts%rowtype;
  v_question public.questions%rowtype;
  v_lesson public.lessons%rowtype;
  v_stats public.user_stats%rowtype;
  v_next_question public.questions%rowtype;

  -- ==========================================================
  -- ANSWER
  -- ==========================================================

  v_payload jsonb := coalesce(p_answer_payload, '{}'::jsonb);
  v_previous_response jsonb;

  v_result public.attempt_result := 'INCORRECT';

  v_correct boolean := false;
  v_timed_out boolean := false;
  v_skipped boolean := false;

  v_similarity numeric(5,4);
  v_normalized_answer text;

  v_response_ms bigint;
  v_time_limit int;

  -- ==========================================================
  -- OPTION VALIDATION
  -- ==========================================================

  v_selected_option bigint;
  v_selected_ids bigint[];
  v_expected_ids bigint[];
  v_valid_selection boolean := false;

  -- ==========================================================
  -- REWARDS
  -- ==========================================================

  v_question_xp int := 0;
  v_lesson_xp int := 0;

  -- IMPORTANT:
  -- Do NOT call this variable total_questions because
  -- total_questions is also a table column.
  v_total_questions int := 0;

  v_score int := 0;

  -- ==========================================================
  -- ATTEMPT RESULT
  -- ==========================================================

  v_question_attempt_id uuid;

  v_hearts_delta int := 0;
  v_new_hearts int;

  v_was_completed boolean := false;
  v_mastered_before boolean := false;

  v_response jsonb;

  v_next_lesson bigint;
  v_next_unit bigint;

begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- ==========================================================
  -- REQUEST ID
  -- ==========================================================

  if p_request_id is null then
    p_request_id := gen_random_uuid();
  end if;

  -- ==========================================================
  -- LOCK LESSON ATTEMPT
  --
  -- This prevents two simultaneous submissions from advancing
  -- the same lesson attempt twice.
  -- ==========================================================

  select *
  into v_attempt
  from public.lesson_attempts
  where id = p_attempt_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  select response_payload
  into v_previous_response
  from public.question_attempts
  where request_id = p_request_id
    and user_id = v_user_id
  limit 1;

  if v_previous_response is not null then
    return v_previous_response;
  end if;

  -- ==========================================================
  -- ATTEMPT STATUS
  -- ==========================================================

  if v_attempt.status <> 'ACTIVE' then
    raise exception 'ATTEMPT_NOT_ACTIVE';
  end if;

  -- ==========================================================
  -- CURRENT QUESTION VALIDATION
  -- ==========================================================

  if v_attempt.current_question_id is null
     or v_attempt.current_question_id <> p_question_id then

    raise exception 'QUESTION_ALREADY_SUBMITTED';

  end if;

  -- ==========================================================
  -- REFRESH HEARTS
  -- ==========================================================

  perform public.refresh_hearts(v_user_id);

  select *
  into v_stats
  from public.user_stats
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'USER_STATS_NOT_FOUND';
  end if;

  -- ==========================================================
  -- LOAD LESSON
  -- ==========================================================

  select *
  into v_lesson
  from public.lessons
  where id = v_attempt.lesson_id;

  if not found then
    raise exception 'LESSON_NOT_FOUND';
  end if;

  -- ==========================================================
  -- LOAD CURRENT QUESTION
  -- ==========================================================

  select *
  into v_question
  from public.questions
  where id = p_question_id
    and lesson_id = v_attempt.lesson_id
    and is_published
  for update;

  if not found then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  -- ==========================================================
  -- PAYLOAD VALIDATION
  -- ==========================================================

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'INVALID_ANSWER_PAYLOAD';
  end if;

  v_skipped :=
    coalesce(
      (v_payload ->> 'skipped')::boolean,
      false
    );

  -- ==========================================================
  -- QUESTION-SPECIFIC PAYLOAD VALIDATION
  -- ==========================================================

  if not v_skipped then

    case v_question.type

      -- -------------------------------------------------------
      -- MCQ SINGLE
      -- -------------------------------------------------------

      when 'MCQ_SINGLE' then

        if not (
          (v_payload ->> 'option_id') ~ '^[0-9]+$'
        ) then
          raise exception 'INVALID_ANSWER_PAYLOAD';
        end if;

      -- -------------------------------------------------------
      -- MCQ MULTI
      -- -------------------------------------------------------

      when 'MCQ_MULTI' then

        if jsonb_typeof(v_payload -> 'option_ids') <> 'array' then
          raise exception 'INVALID_ANSWER_PAYLOAD';
        end if;

      -- -------------------------------------------------------
      -- WORD BANK
      -- -------------------------------------------------------

      when 'WORD_BANK' then

        if jsonb_typeof(v_payload -> 'option_ids') <> 'array' then
          raise exception 'INVALID_ANSWER_PAYLOAD';
        end if;

      -- -------------------------------------------------------
      -- FILL BLANK
      -- -------------------------------------------------------

      when 'FILL_BLANK' then

        if jsonb_typeof(v_payload -> 'text') <> 'string' then
          raise exception 'INVALID_ANSWER_PAYLOAD';
        end if;

      -- -------------------------------------------------------
      -- LISTENING
      -- -------------------------------------------------------

      when 'LISTENING' then

        if jsonb_typeof(v_payload -> 'text') <> 'string' then
          raise exception 'INVALID_ANSWER_PAYLOAD';
        end if;

      -- -------------------------------------------------------
      -- SPEAKING
      -- -------------------------------------------------------

      when 'SPEAKING' then

        /*
         * Transcript and similarity are generated by the
         * trusted Edge Function.
         */

        if p_speaking_transcript is null
           or length(trim(p_speaking_transcript)) = 0 then

          raise exception 'SPEAKING_TRANSCRIPT_REQUIRED';

        end if;

        if p_speaking_similarity is null
           or p_speaking_similarity < 0
           or p_speaking_similarity > 1 then

          raise exception 'SPEAKING_SIMILARITY_INVALID';

        end if;

        v_payload :=
          jsonb_set(
            v_payload,
            '{transcript}',
            to_jsonb(p_speaking_transcript),
            true
          );

      else

        raise exception 'UNSUPPORTED_QUESTION_TYPE';

    end case;

  end if;

  -- ==========================================================
  -- RESPONSE TIME
  -- ==========================================================

  v_response_ms :=
    greatest(
      0,
      floor(
        extract(
          epoch
          from (
            v_now
            - coalesce(
                v_attempt.current_question_started_at,
                v_now
              )
          )
        ) * 1000
      )
    )::bigint;

  -- Never allow absurdly large client/session timing values.
  v_response_ms :=
    least(
      v_response_ms,
      30 * 60 * 1000
    );

  v_time_limit := v_question.time_limit_seconds;

  v_timed_out :=
    v_time_limit is not null
    and v_response_ms >= v_time_limit * 1000;

  -- ==========================================================
  -- DETERMINE RESULT
  -- ==========================================================

  if v_timed_out then

    v_result := 'TIMEOUT';

  elsif v_skipped then

    v_result := 'SKIPPED';

  else

    case v_question.type

      -- ======================================================
      -- MCQ SINGLE
      -- ======================================================

      when 'MCQ_SINGLE' then

        v_selected_option :=
          (v_payload ->> 'option_id')::bigint;

        select exists (
          select 1
          from public.question_options qo
          where qo.id = v_selected_option
            and qo.question_id = v_question.id
            and qo.is_correct
        )
        into v_correct;

      -- ======================================================
      -- MCQ MULTI
      -- ======================================================

      when 'MCQ_MULTI' then

        select
          coalesce(
            array_agg(
              distinct value::bigint
              order by value::bigint
            ),
            '{}'::bigint[]
          )
        into v_selected_ids
        from jsonb_array_elements_text(
          v_payload -> 'option_ids'
        ) x(value)
        where value ~ '^[0-9]+$';

        select
          coalesce(
            array_agg(
              qo.id
              order by qo.id
            ),
            '{}'::bigint[]
          )
        into v_expected_ids
        from public.question_options qo
        where qo.question_id = v_question.id
          and qo.is_correct;

        v_valid_selection :=
          not exists (
            select 1
            from jsonb_array_elements_text(
              v_payload -> 'option_ids'
            ) x(value)
            where value !~ '^[0-9]+$'
          )
          and cardinality(v_selected_ids)
              =
              jsonb_array_length(
                v_payload -> 'option_ids'
              )
          and cardinality(v_selected_ids)
              =
              (
                select count(*)
                from public.question_options qo
                where qo.question_id = v_question.id
                  and qo.id = any(v_selected_ids)
              );

        if v_valid_selection then
          v_correct :=
            v_selected_ids = v_expected_ids;
        end if;

      -- ======================================================
      -- WORD BANK
      -- ======================================================

      when 'WORD_BANK' then

        select
          coalesce(
            array_agg(
              value::bigint
            ),
            '{}'::bigint[]
          )
        into v_selected_ids
        from jsonb_array_elements_text(
          v_payload -> 'option_ids'
        ) x(value)
        where value ~ '^[0-9]+$';

        select
          coalesce(
            array_agg(
              qo.id
              order by qo.correct_order
            ),
            '{}'::bigint[]
          )
        into v_expected_ids
        from public.question_options qo
        where qo.question_id = v_question.id
          and qo.correct_order is not null;

        v_valid_selection :=
          not exists (
            select 1
            from jsonb_array_elements_text(
              v_payload -> 'option_ids'
            ) x(value)
            where value !~ '^[0-9]+$'
          )
          and cardinality(v_selected_ids)
              =
              jsonb_array_length(
                v_payload -> 'option_ids'
              )
          and cardinality(v_selected_ids)
              =
              (
                select count(*)
                from public.question_options qo
                where qo.question_id = v_question.id
                  and qo.id = any(v_selected_ids)
              );

        if v_valid_selection then
          v_correct :=
            v_selected_ids = v_expected_ids;
        end if;

      -- ======================================================
      -- FILL BLANK / LISTENING
      -- ======================================================

      when 'FILL_BLANK', 'LISTENING' then

        v_normalized_answer :=
          public.normalize_answer(
            v_payload ->> 'text',
            v_question.normalization_config
          );

        v_correct :=
          coalesce(
            public.normalize_answer(
              v_question.target_text,
              v_question.normalization_config
            ) = v_normalized_answer,
            false
          );

        -- Accepted alternatives
        if not v_correct
           and jsonb_typeof(v_question.accepted_answers) = 'array'
        then

          select exists (
            select 1
            from jsonb_array_elements_text(
              v_question.accepted_answers
            ) x(value)
            where public.normalize_answer(
              x.value,
              v_question.normalization_config
            ) = v_normalized_answer
          )
          into v_correct;

        end if;

        -- Similarity
        if v_question.target_text is not null
           and v_normalized_answer is not null
        then

          v_similarity :=
            greatest(
              0,
              least(
                1,
                1 -
                (
                  public.levenshtein_distance(
                    v_normalized_answer,
                    public.normalize_answer(
                      v_question.target_text,
                      v_question.normalization_config
                    )
                  )::numeric
                  /
                  greatest(
                    char_length(
                      public.normalize_answer(
                        v_question.target_text,
                        v_question.normalization_config
                      )
                    ),
                    char_length(v_normalized_answer),
                    1
                  )
                )
              )
            );

        end if;

      -- ======================================================
      -- SPEAKING
      -- ======================================================

      when 'SPEAKING' then

        v_normalized_answer :=
          public.normalize_answer(
            p_speaking_transcript,
            v_question.normalization_config
          );

        v_similarity :=
          round(
            p_speaking_similarity::numeric,
            4
          );

        v_correct :=
          coalesce(
            v_similarity >=
            coalesce(
              (
                v_question.speaking_config
                ->> 'similarity_threshold'
              )::numeric,
              0.80
            ),
            false
          );

      else

        v_correct := false;

    end case;

    v_result :=
      case
        when v_correct then 'CORRECT'
        else 'INCORRECT'
      end;

  end if;

  -- ==========================================================
  -- PREVIOUS QUESTION PROGRESS
  -- ==========================================================

  select completed
  into v_was_completed
  from public.user_question_progress
  where user_id = v_user_id
    and question_id = v_question.id;

  select mastered
  into v_mastered_before
  from public.user_mistakes
  where user_id = v_user_id
    and question_id = v_question.id;

  -- ==========================================================
  -- XP
  -- ==========================================================

  if v_result = 'CORRECT' then

    v_question_xp :=
      case
        when coalesce(v_mastered_before, false)
          then 0

        when coalesce(v_was_completed, false)
          then least(v_question.xp, 2)

        else
          v_question.xp
      end;

  else

    v_question_xp := 0;

  end if;

  -- ==========================================================
  -- HEART PENALTY
  -- ==========================================================

  if v_result in ('INCORRECT', 'TIMEOUT') then
    v_hearts_delta := -1;
  else
    v_hearts_delta := 0;
  end if;

  -- Make sure we never go below zero.
  if v_hearts_delta < 0 then

    v_new_hearts :=
      greatest(
        0,
        v_stats.hearts + v_hearts_delta
      );

    v_hearts_delta :=
      v_new_hearts - v_stats.hearts;

  else

    v_new_hearts := v_stats.hearts;

  end if;

  -- ==========================================================
  -- SAVE QUESTION ATTEMPT
  -- ==========================================================

  insert into public.question_attempts(
    lesson_attempt_id,
    user_id,
    question_id,
    request_id,
    answer_payload,
    normalized_answer,
    result,
    similarity_score,
    xp_awarded,
    hearts_delta,
    response_time_ms
  )
  values(
    v_attempt.id,
    v_user_id,
    v_question.id,
    p_request_id,
    v_payload,
    v_normalized_answer,
    v_result,
    v_similarity,
    v_question_xp,
    v_hearts_delta,
    v_response_ms
  )
  returning id
  into v_question_attempt_id;

  -- ==========================================================
  -- HEART LEDGER
  -- ==========================================================

  if v_hearts_delta <> 0 then

    v_response :=
      public.change_hearts(
        v_user_id,
        v_hearts_delta,

        case
          when v_result = 'TIMEOUT'
            then 'TIMEOUT'
          else
            'WRONG_ANSWER'
        end,

        'ANSWER_HEART:' ||
        v_question_attempt_id::text,

        v_question.id,
        v_attempt.lesson_id,
        v_question_attempt_id,

        jsonb_build_object(
          'result',
          v_result
        )
      );

    v_new_hearts :=
      coalesce(
        (v_response ->> 'hearts')::int,
        v_stats.hearts
      );

    v_hearts_delta :=
      coalesce(
        (v_response ->> 'amount')::int,
        v_hearts_delta
      );

  else

    v_new_hearts := v_stats.hearts;

  end if;

  -- ==========================================================
  -- QUESTION XP
  -- ==========================================================

  if v_question_xp > 0 then

    perform public.grant_xp(
      p_user_id => v_user_id,
      p_amount => v_question_xp,
      p_type => 'QUESTION_XP',
      p_source_key => 'QUESTION:' || v_question_attempt_id::text,
      p_question_id => v_question.id,
      p_lesson_id => v_attempt.lesson_id,
      p_question_attempt_id => v_question_attempt_id,
      p_description => 'Question XP',
      p_metadata => jsonb_build_object(
        'practice', coalesce(v_was_completed, false),
        'mastered', coalesce(v_mastered_before, false)
      )
    );

  end if;

  -- ==========================================================
  -- USER QUESTION PROGRESS
  -- ==========================================================

  insert into public.user_question_progress(
    user_id,
    question_id,
    completed,
    correct_count,
    incorrect_count,
    attempts,
    best_similarity,
    last_answer,
    completed_at
  )
  values(
    v_user_id,
    v_question.id,

    v_result = 'CORRECT',

    case
      when v_result = 'CORRECT'
        then 1
      else 0
    end,

    case
      when v_result in ('INCORRECT', 'TIMEOUT')
        then 1
      else 0
    end,

    1,

    v_similarity,

    v_payload,

    case
      when v_result = 'CORRECT'
        then v_now
      else null
    end
  )
  on conflict(user_id, question_id)
  do update set

    completed =
      public.user_question_progress.completed
      or v_result = 'CORRECT',

    correct_count =
      public.user_question_progress.correct_count
      +
      case
        when v_result = 'CORRECT'
          then 1
        else 0
      end,

    incorrect_count =
      public.user_question_progress.incorrect_count
      +
      case
        when v_result in ('INCORRECT', 'TIMEOUT')
          then 1
        else 0
      end,

    attempts =
      public.user_question_progress.attempts + 1,

    best_similarity =
      case
        when v_similarity is null
          then public.user_question_progress.best_similarity

        else
          greatest(
            coalesce(
              public.user_question_progress.best_similarity,
              0
            ),
            v_similarity
          )
      end,

    last_answer = v_payload,

    completed_at =
      case
        when v_result = 'CORRECT'
          then coalesce(
            public.user_question_progress.completed_at,
            v_now
          )

        else
          public.user_question_progress.completed_at
      end,

    updated_at = now();

  -- ==========================================================
  -- TOTAL QUESTIONS
  --
  -- IMPORTANT:
  -- This uses v_total_questions to avoid the previous
  -- "column reference total_questions is ambiguous" error.
  -- ==========================================================

  select count(*)
  into v_total_questions
  from public.questions
  where lesson_id = v_attempt.lesson_id
    and is_published;

  -- ==========================================================
  -- UPDATE LESSON ATTEMPT COUNTERS
  -- ==========================================================

  update public.lesson_attempts
  set

    questions_seen =
      questions_seen + 1,

    questions_answered =
      questions_answered
      +
      case
        when v_result <> 'SKIPPED'
          then 1
        else 0
      end,

    correct_answers =
      correct_answers
      +
      case
        when v_result = 'CORRECT'
          then 1
        else 0
      end,

    incorrect_answers =
      incorrect_answers
      +
      case
        when v_result = 'INCORRECT'
          then 1
        else 0
      end,

    timeout_answers =
      timeout_answers
      +
      case
        when v_result = 'TIMEOUT'
          then 1
        else 0
      end,

    skipped_answers =
      skipped_answers
      +
      case
        when v_result = 'SKIPPED'
          then 1
        else 0
      end,

    xp_earned =
      xp_earned + v_question_xp,

    updated_at = now()

  where id = v_attempt.id

  returning *
  into v_attempt;

  -- ==========================================================
  -- OUT OF HEARTS
  -- ==========================================================

  if v_new_hearts = 0 then

    update public.lesson_attempts
    set
      status = 'FAILED',
      ending_hearts = 0,

      current_question_id = null,
      current_question_order = null,
      current_question_started_at = null,

      completed_at = now(),
      updated_at = now()

    where id = v_attempt.id;

    update public.user_lesson_progress
    set
      status =
        (
          case
            when public.user_lesson_progress.status = 'COMPLETED'
              then 'COMPLETED'
            else
              'AVAILABLE'
          end
        )::public.lesson_status,

      current_question_order = 0,

      updated_at = now()

    where user_id = v_user_id
      and lesson_id = v_attempt.lesson_id;

    v_response :=
      jsonb_build_object(

        'success', true,

        'attempt_id', v_attempt.id,

        'question_id', v_question.id,

        'result', v_result,

        'is_correct',
          v_result = 'CORRECT',

        'xp_awarded',
          v_question_xp,

        'lesson_xp_awarded',
          0,

        'total_xp_earned',
          v_question_xp,

        'hearts',
          0,

        'max_hearts',
          v_stats.max_hearts,

        'hearts_delta',
          v_hearts_delta,

        'response_time_ms',
          v_response_ms,

        'similarity_score',
          v_similarity,

        'correct_answer',
          public.build_correct_answer(v_question.id),

        'explanation',
          v_question.explanation,

        'questions_seen',
          v_attempt.questions_seen,

        'questions_answered',
          v_attempt.questions_answered,

        'correct_answers',
          v_attempt.correct_answers,

        'incorrect_answers',
          v_attempt.incorrect_answers,

        'score',
          round(
            v_attempt.correct_answers::numeric
            /
            greatest(v_total_questions, 1)
            * 100
          )::int,

        'lesson_completed',
          false,

        'lesson_failed',
          true,

        'out_of_hearts',
          true,

        'same_question',
          false,

        'next_question',
          null,

        'next_lesson_id',
          null,

        'next_unit_id',
          null,

        'question_attempt_id',
          v_question_attempt_id,

        'total_xp',
          (
            select total_xp
            from public.user_stats
            where user_id = v_user_id
          )
      );

  else

    -- ========================================================
    -- WRONG / TIMEOUT
    --
    -- IMPORTANT:
    -- NEVER ADVANCE THE LESSON ATTEMPT.
    --
    -- current_question_id remains the same.
    -- current_question_order remains the same.
    -- ========================================================

    if v_result in ('INCORRECT', 'TIMEOUT') then

      v_response :=
        jsonb_build_object(

          'success', true,

          'attempt_id', v_attempt.id,

          'question_id', v_question.id,

          'result', v_result,

          'is_correct',
            false,

          'xp_awarded',
            0,

          'lesson_xp_awarded',
            0,

          'total_xp_earned',
            0,

          'hearts',
            (
              select hearts
              from public.user_stats
              where user_id = v_user_id
            ),

          'max_hearts',
            v_stats.max_hearts,

          'hearts_delta',
            v_hearts_delta,

          'response_time_ms',
            v_response_ms,

          'similarity_score',
            v_similarity,

          'correct_answer',
            public.build_correct_answer(v_question.id),

          'explanation',
            v_question.explanation,

          'questions_seen',
            v_attempt.questions_seen,

          'questions_answered',
            v_attempt.questions_answered,

          'correct_answers',
            v_attempt.correct_answers,

          'incorrect_answers',
            v_attempt.incorrect_answers,

          'score',
            round(
              v_attempt.correct_answers::numeric
              /
              greatest(v_total_questions, 1)
              * 100
            )::int,

          'lesson_completed',
            false,

          'lesson_failed',
            false,

          'out_of_hearts',
            false,

          'same_question',
            true,

          /*
           * Return the CURRENT question again.
           */
          'next_question',
            public.safe_question(v_question.id),

          /*
           * Also expose it explicitly for the frontend.
           */
          'current_question',
            public.safe_question(v_question.id),

          'next_lesson_id',
            null,

          'next_unit_id',
            null,

          'question_attempt_id',
            v_question_attempt_id,

          'total_xp',
            (
              select total_xp
              from public.user_stats
              where user_id = v_user_id
            )
        );

    -- ========================================================
    -- CORRECT
    --
    -- ONLY HERE DO WE FIND THE NEXT QUESTION.
    -- ========================================================

    else

      select *
      into v_next_question
      from public.questions
      where lesson_id = v_attempt.lesson_id
        and is_published
        and order_index > v_question.order_index
      order by order_index
      limit 1;

      -- ======================================================
      -- NEXT QUESTION EXISTS
      -- ======================================================

      if v_next_question.id is not null then

        -- Advance only after CORRECT.
        update public.lesson_attempts
        set

          current_question_id =
            v_next_question.id,

          current_question_order =
            v_next_question.order_index,

          current_question_started_at =
            clock_timestamp(),

          updated_at = now()

        where id = v_attempt.id;

        /*
         * completed_questions means UNIQUE questions
         * successfully completed, not number of attempts.
         */
        update public.user_lesson_progress
        set

          current_question_order =
            v_next_question.order_index,

          completed_questions =
            (
              select count(*)
              from public.questions q2
              where q2.lesson_id = v_attempt.lesson_id
                and q2.is_published
                and q2.order_index <= v_question.order_index
            ),

          updated_at = now()

        where user_id = v_user_id
          and lesson_id = v_attempt.lesson_id;

        v_response :=
          jsonb_build_object(

            'success', true,

            'attempt_id', v_attempt.id,

            'question_id', v_question.id,

            'result', v_result,

            'is_correct',
              true,

            'xp_awarded',
              v_question_xp,

            'lesson_xp_awarded',
              0,

            'total_xp_earned',
              v_question_xp,

            'hearts',
              (
                select hearts
                from public.user_stats
                where user_id = v_user_id
              ),

            'max_hearts',
              v_stats.max_hearts,

            'hearts_delta',
              v_hearts_delta,

            'response_time_ms',
              v_response_ms,

            'similarity_score',
              v_similarity,

            'correct_answer',
              public.build_correct_answer(v_question.id),

            'explanation',
              v_question.explanation,

            'questions_seen',
              v_attempt.questions_seen,

            'questions_answered',
              v_attempt.questions_answered,

            'correct_answers',
              v_attempt.correct_answers,

            'incorrect_answers',
              v_attempt.incorrect_answers,

            'score',
              round(
                v_attempt.correct_answers::numeric
                /
                greatest(v_total_questions, 1)
                * 100
              )::int,

            'lesson_completed',
              false,

            'lesson_failed',
              false,

            'out_of_hearts',
              false,

            'same_question',
              false,

            'next_question',
              public.safe_question(v_next_question.id),

            'current_question',
              public.safe_question(v_next_question.id),

            'next_lesson_id',
              null,

            'next_unit_id',
              null,

            'question_attempt_id',
              v_question_attempt_id,

            'total_xp',
              (
                select total_xp
                from public.user_stats
                where user_id = v_user_id
              )
          );

      -- ======================================================
      -- NO NEXT QUESTION = LESSON COMPLETE
      -- ======================================================

      else

        v_score :=
          round(
            v_attempt.correct_answers::numeric
            /
            greatest(v_total_questions, 1)
            * 100
          )::int;

        v_lesson_xp :=
          case

            when not exists (
              select 1
              from public.user_lesson_progress
              where user_id = v_user_id
                and lesson_id = v_attempt.lesson_id
                and status = 'COMPLETED'
            )
            then v_lesson.xp_reward

            else 0

          end;

        -- ====================================================
        -- LESSON XP
        -- ====================================================

        if v_lesson_xp > 0 then

          perform public.grant_xp(
            p_user_id => v_user_id,
            p_amount => v_lesson_xp,
            p_type => 'LESSON_COMPLETION',
            p_source_key => 'LESSON:' || v_attempt.id::text,
            p_question_id => null,
            p_lesson_id => v_attempt.lesson_id,
            p_question_attempt_id => null,
            p_description => 'Lesson completed',
            p_metadata => jsonb_build_object(
              'lesson_id', v_attempt.lesson_id,
              'lesson_attempt_id', v_attempt.id,
              'score', v_score
            )
          );

        end if;

        -- ====================================================
        -- COMPLETE LESSON ATTEMPT
        -- ====================================================

        update public.lesson_attempts
        set

          status = 'COMPLETED',

          ending_hearts =
            (
              select hearts
              from public.user_stats
              where user_id = v_user_id
            ),

          xp_earned =
            xp_earned + v_lesson_xp,

          current_question_id = null,
          current_question_order = null,
          current_question_started_at = null,

          completed_at = now(),
          updated_at = now()

        where id = v_attempt.id;

        -- ====================================================
        -- COMPLETE LESSON PROGRESS
        -- ====================================================

        update public.user_lesson_progress
        set

          status = 'COMPLETED',

          current_question_order = 0,

          completed_questions =
            v_total_questions,

          best_score =
            greatest(
              best_score,
              v_score
            ),

          completed_at =
            coalesce(
              completed_at,
              now()
            ),

          updated_at = now()

        where user_id = v_user_id
          and lesson_id = v_attempt.lesson_id;

        -- ====================================================
        -- COMPLETE UNIT IF ALL LESSONS ARE COMPLETE
        -- ====================================================

        update public.user_unit_progress up
        set

          completed = true,

          completed_at =
            coalesce(
              up.completed_at,
              now()
            ),

          unlocked = true,

          updated_at = now()

        where up.user_id = v_user_id
          and up.unit_id = v_lesson.unit_id

          and not exists (
            select 1
            from public.lessons ll
            where ll.unit_id = v_lesson.unit_id
              and ll.is_published

              and not exists (
                select 1
                from public.user_lesson_progress lp
                where lp.user_id = v_user_id
                  and lp.lesson_id = ll.id
                  and lp.status = 'COMPLETED'
              )
          );

        -- ====================================================
        -- NEXT LESSON
        -- ====================================================

        select id
        into v_next_lesson
        from public.lessons
        where unit_id = v_lesson.unit_id
          and is_published
          and order_index > v_lesson.order_index
        order by order_index
        limit 1;

        if v_next_lesson is not null then

          insert into public.user_lesson_progress(
            user_id,
            lesson_id,
            status
          )
          values(
            v_user_id,
            v_next_lesson,
            'AVAILABLE'
          )

          on conflict(user_id, lesson_id)
          do update set

            status =
              (
                case
                  when public.user_lesson_progress.status = 'COMPLETED'
                    then 'COMPLETED'
                  else
                    'AVAILABLE'
                end
              )::public.lesson_status,

            updated_at = now();

        else

          -- ==================================================
          -- NEXT UNIT
          -- ==================================================

          select id
          into v_next_unit
          from public.units
          where is_published

            and course_id = (
              select course_id
              from public.units
              where id = v_lesson.unit_id
            )

            and order_index > (
              select order_index
              from public.units
              where id = v_lesson.unit_id
            )

          order by order_index
          limit 1;

          if v_next_unit is not null then

            insert into public.user_unit_progress(
              user_id,
              unit_id,
              unlocked
            )
            values(
              v_user_id,
              v_next_unit,
              true
            )

            on conflict(user_id, unit_id)
            do update set

              unlocked = true,
              updated_at = now();

            select id
            into v_next_lesson
            from public.lessons
            where unit_id = v_next_unit
              and is_published
            order by order_index
            limit 1;

            if v_next_lesson is not null then

              insert into public.user_lesson_progress(
                user_id,
                lesson_id,
                status
              )
              values(
                v_user_id,
                v_next_lesson,
                'AVAILABLE'
              )

              on conflict(user_id, lesson_id)
              do update set

                status =
                  (
                    case
                      when public.user_lesson_progress.status = 'COMPLETED'
                        then 'COMPLETED'
                      else
                        'AVAILABLE'
                    end
                  )::public.lesson_status,

                updated_at = now();

            end if;

          end if;

        end if;

        -- ====================================================
        -- LESSON COMPLETE RESPONSE
        -- ====================================================

        v_response :=
          jsonb_build_object(

            'success', true,

            'attempt_id', v_attempt.id,

            'question_id', v_question.id,

            'result', v_result,

            'is_correct',
              true,

            'xp_awarded',
              v_question_xp,

            'lesson_xp_awarded',
              v_lesson_xp,

            'total_xp_earned',
              v_question_xp + v_lesson_xp,

            'hearts',
              (
                select hearts
                from public.user_stats
                where user_id = v_user_id
              ),

            'max_hearts',
              v_stats.max_hearts,

            'hearts_delta',
              v_hearts_delta,

            'response_time_ms',
              v_response_ms,

            'similarity_score',
              v_similarity,

            'correct_answer',
              public.build_correct_answer(v_question.id),

            'explanation',
              v_question.explanation,

            'questions_seen',
              v_attempt.questions_seen,

            'questions_answered',
              v_attempt.questions_answered,

            'correct_answers',
              v_attempt.correct_answers,

            'incorrect_answers',
              v_attempt.incorrect_answers,

            'score',
              v_score,

            'lesson_completed',
              true,

            'lesson_failed',
              false,

            'out_of_hearts',
              false,

            'same_question',
              false,

            'unit_completed',
              coalesce(
                (
                  select completed
                  from public.user_unit_progress
                  where user_id = v_user_id
                    and unit_id = v_lesson.unit_id
                ),
                false
              ),

            'next_question',
              null,

            'current_question',
              null,

            'next_lesson_id',
              v_next_lesson,

            'next_unit_id',
              v_next_unit,

            'question_attempt_id',
              v_question_attempt_id,

            'total_xp',
              (
                select total_xp
                from public.user_stats
                where user_id = v_user_id
              )
          );

      end if;

    end if;

  end if;

  -- ==========================================================
  -- SAVE FINAL RESPONSE FOR IDEMPOTENCY
  -- ==========================================================

  update public.question_attempts
  set response_payload = v_response
  where id = v_question_attempt_id;

  return v_response;

end;
$function$


CREATE OR REPLACE FUNCTION public.claim_ad_heart(p_source_key text DEFAULT NULL::text)
 RETURNS TABLE(hearts integer, max_hearts integer, awarded boolean, transaction_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_hearts integer;
  v_max_hearts integer;
  v_transaction_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_stats (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT us.hearts, us.max_hearts
  INTO v_hearts, v_max_hearts
  FROM public.user_stats AS us
  WHERE us.user_id = v_user_id
  FOR UPDATE;

  IF p_source_key IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.heart_transactions AS ht
    WHERE ht.user_id = v_user_id
      AND ht.source_key = p_source_key
  ) THEN
    SELECT ht.id
    INTO v_transaction_id
    FROM public.heart_transactions AS ht
    WHERE ht.user_id = v_user_id
      AND ht.source_key = p_source_key
    ORDER BY ht.created_at DESC
    LIMIT 1;

    RETURN QUERY SELECT v_hearts, v_max_hearts, false, v_transaction_id;
    RETURN;
  END IF;

  IF v_hearts >= v_max_hearts THEN
    RETURN QUERY SELECT v_hearts, v_max_hearts, false, NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.user_stats AS us
  SET hearts = us.hearts + 1,
      updated_at = now()
  WHERE us.user_id = v_user_id
  RETURNING us.hearts INTO v_hearts;

  INSERT INTO public.heart_transactions (
    user_id,
    amount,
    reason,
    source_type,
    source_key,
    metadata
  )
  VALUES (
    v_user_id,
    1,
    'Reward for watching an advertisement',
    'AD_REWARD',
    p_source_key,
    jsonb_build_object('reward', 'heart')
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_hearts, v_max_hearts, true, v_transaction_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_lesson_details(p_lesson_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'success', true,
    'lesson', case
      when l.id is null then null::jsonb
      else jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'description', l.description,
        'image_url', l.image_url,
        'icon_url', l.icon_url,
        'order_index', l.order_index,
        'xp_reward', l.xp_reward,
        'estimated_minutes', l.estimated_minutes,
        'is_published', l.is_published,
        'metadata', l.metadata,
        'created_at', l.created_at,
        'updated_at', l.updated_at,
        'unit', case
          when u.id is null then null::jsonb
          else jsonb_build_object(
            'id', u.id,
            'course_id', u.course_id,
            'title', u.title,
            'description', u.description,
            'image_url', u.image_url,
            'icon_url', u.icon_url,
            'order_index', u.order_index,
            'is_published', u.is_published,
            'metadata', u.metadata
          )
        end,
        'course', case
          when c.id is null then null::jsonb
          else jsonb_build_object(
            'id', c.id,
            'code', c.code,
            'title', c.title,
            'source_language', c.source_language,
            'target_language', c.target_language,
            'is_active', c.is_active,
            'metadata', c.metadata
          )
        end
      )
    end,
    'question_count', case
      when l.id is null then 0
      else (select count(*) from public.questions q_count where q_count.lesson_id = l.id)
    end,
    'questions', case
      when l.id is null then '[]'::jsonb
      else coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'type', q.type,
            'prompt', q.prompt,
            'instruction', q.instruction,
            'answer', jsonb_build_object(
              'correct_options', coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'text', qo.text,
                    'correct_order', qo.correct_order
                  ) order by qo.order_index, qo.id
                )
                from public.question_options qo
                where qo.question_id = q.id
                  and qo.is_correct = true
              ), '[]'::jsonb),
              'accepted_answers', coalesce(q.accepted_answers, '[]'::jsonb),
              'target_text', q.target_text,
              'target_translation', q.target_translation
            )
          ) order by q.order_index, q.id
        )
        from public.questions q
        where q.lesson_id = l.id
      ), '[]'::jsonb)
    end
  )
  from public.lessons l
  left join public.units u on u.id = l.unit_id
  left join public.courses c on c.id = u.course_id
  where l.id = p_lesson_id;
$function$


CREATE OR REPLACE FUNCTION public.get_my_achievements()
 RETURNS TABLE(achievement_id bigint, code text, title text, description text, icon_url text, requirement_type text, requirement_value integer, xp_reward integer, gem_reward integer, progress integer, unlocked boolean, unlocked_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT
    a.id AS achievement_id,
    a.code,
    a.title,
    a.description,
    a.icon_url,
    a.requirement_type,
    a.requirement_value,
    a.xp_reward,
    a.gem_reward,
    COALESCE(ua.progress, 0) AS progress,
    COALESCE(ua.unlocked, false) AS unlocked,
    ua.unlocked_at
  FROM public.achievements AS a
  LEFT JOIN public.user_achievements AS ua
    ON ua.achievement_id = a.id
   AND ua.user_id = (SELECT auth.uid())
  WHERE a.is_active = true
  ORDER BY a.id;
$function$


CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_entity_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('read'); if p_limit<1 or p_limit>500 then raise exception 'INVALID_LIMIT'; end if; if p_offset<0 then raise exception 'INVALID_OFFSET'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select a.*,u.email admin_email,au.role admin_role from public.admin_audit_logs a join auth.users u on u.id=a.admin_user_id join public.admin_users au on au.user_id=a.admin_user_id
    where p_entity_type is null or a.entity_type=p_entity_type order by a.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_require(p_area text DEFAULT 'read'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'ADMIN_AUTH_REQUIRED' using errcode='42501';
  end if;

  select role into v_role
  from public.admin_users
  where user_id=v_uid and is_active=true;

  if v_role is null then
    raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501';
  end if;

  if v_role='super_admin' then return v_uid; end if;

  if p_area='content' and v_role<>'content_admin' then
    raise exception 'ADMIN_CONTENT_PERMISSION_REQUIRED' using errcode='42501';
  end if;
  if p_area='support' and v_role<>'support_admin' then
    raise exception 'ADMIN_SUPPORT_PERMISSION_REQUIRED' using errcode='42501';
  end if;
  if p_area='analytics' and v_role<>'analytics_admin' then
    raise exception 'ADMIN_ANALYTICS_PERMISSION_REQUIRED' using errcode='42501';
  end if;
  if p_area='user_read' and v_role not in ('support_admin','analytics_admin') then
    raise exception 'ADMIN_USER_READ_PERMISSION_REQUIRED' using errcode='42501';
  end if;

  return v_uid;
end;
$function$


CREATE OR REPLACE FUNCTION public.get_shop()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_gems bigint := 0;

  v_boost_until timestamptz;
  v_boost_multiplier numeric := 1;

  v_items jsonb;
begin

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  /*
   * Get current gem balance.
   */
  select coalesce(sum(gt.amount), 0)
  into v_gems
  from public.gem_transactions gt
  where gt.user_id = v_user_id;

  /*
   * Get current XP boost.
   */
  select
    coalesce(us.xp_boost_until, null),
    coalesce(us.xp_boost_multiplier, 1)
  into
    v_boost_until,
    v_boost_multiplier
  from public.user_stats us
  where us.user_id = v_user_id;

  /*
   * Return active shop items.
   */
  select coalesce(
    jsonb_agg(
      to_jsonb(si)
      order by si.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.shop_items si
  where si.is_active = true;

  return jsonb_build_object(
    'success', true,

    'gems', v_gems,

    'xp_boost', jsonb_build_object(
      'active',
        (
          v_boost_until is not null
          and v_boost_until > now()
          and v_boost_multiplier > 1
        ),
      'multiplier',
        case
          when v_boost_until is not null
           and v_boost_until > now()
          then v_boost_multiplier
          else 1
        end,
      'until',
        case
          when v_boost_until is not null
           and v_boost_until > now()
          then v_boost_until
          else null
        end
    ),

    'items', v_items
  );

end;
$function$


CREATE OR REPLACE FUNCTION public.admin_create_achievement(p_code text, p_title text, p_description text, p_icon_url text, p_requirement_type text, p_requirement_value integer, p_xp_reward integer DEFAULT 0, p_gem_reward integer DEFAULT 0, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare a public.achievements;
begin
  perform public.admin_require('content');
  if nullif(trim(p_code),'') is null or nullif(trim(p_title),'') is null or nullif(trim(p_requirement_type),'') is null then raise exception 'ACHIEVEMENT_REQUIRED_FIELDS_MISSING'; end if;
  if p_requirement_value<=0 or p_xp_reward<0 or p_gem_reward<0 then raise exception 'INVALID_ACHIEVEMENT_VALUES'; end if;
  insert into public.achievements(code,title,description,icon_url,requirement_type,requirement_value,xp_reward,gem_reward,is_active)
  values(trim(p_code),trim(p_title),p_description,p_icon_url,trim(p_requirement_type),p_requirement_value,p_xp_reward,p_gem_reward,p_is_active) returning * into a;
  perform public.admin_audit('CREATE','achievement',a.id::text,null,to_jsonb(a)); return to_jsonb(a);
exception when unique_violation then raise exception 'ACHIEVEMENT_CODE_ALREADY_EXISTS';
end; $function$


CREATE OR REPLACE FUNCTION public.admin_create_course(p_code text, p_title text, p_source_language text, p_target_language text, p_is_active boolean DEFAULT true, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v public.courses;
begin
  perform public.admin_require('content');
  if nullif(trim(p_code),'') is null or nullif(trim(p_title),'') is null
     or nullif(trim(p_source_language),'') is null or nullif(trim(p_target_language),'') is null
  then raise exception 'COURSE_REQUIRED_FIELDS_MISSING'; end if;
  insert into public.courses(code,title,source_language,target_language,is_active,metadata)
  values(trim(p_code),trim(p_title),trim(p_source_language),trim(p_target_language),coalesce(p_is_active,true),coalesce(p_metadata,'{}'::jsonb))
  returning * into v;
  perform public.admin_audit('CREATE','course',v.id::text,null,to_jsonb(v));
  return to_jsonb(v);
exception when unique_violation then raise exception 'COURSE_CODE_ALREADY_EXISTS';
end; $function$


CREATE OR REPLACE FUNCTION public.admin_create_lesson(p_unit_id bigint, p_title text, p_description text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_icon_url text DEFAULT NULL::text, p_xp_reward integer DEFAULT 20, p_estimated_minutes integer DEFAULT NULL::integer, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v public.lessons; n int;
begin
  perform public.admin_require('content');
  if not exists(select 1 from public.units where id=p_unit_id) then raise exception 'UNIT_NOT_FOUND'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'LESSON_TITLE_REQUIRED'; end if;
  if coalesce(p_xp_reward,20)<0 then raise exception 'INVALID_XP_REWARD'; end if;
  if p_estimated_minutes is not null and p_estimated_minutes<=0 then raise exception 'INVALID_ESTIMATED_MINUTES'; end if;
  select coalesce(max(order_index),-1)+1 into n from public.lessons where unit_id=p_unit_id;
  insert into public.lessons(unit_id,title,description,image_url,icon_url,order_index,xp_reward,estimated_minutes,metadata)
  values(p_unit_id,trim(p_title),p_description,p_image_url,p_icon_url,n,coalesce(p_xp_reward,20),p_estimated_minutes,coalesce(p_metadata,'{}'::jsonb))
  returning * into v;
  perform public.admin_audit('CREATE','lesson',v.id::text,null,to_jsonb(v)); return to_jsonb(v);
end; $function$


CREATE OR REPLACE FUNCTION public.get_xp_boost_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();

  v_until timestamptz;
  v_multiplier numeric;
  v_remaining_seconds bigint;
begin

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select
    xp_boost_until,
    coalesce(xp_boost_multiplier, 1)
  into
    v_until,
    v_multiplier
  from public.user_stats
  where user_id = v_user_id;

  if v_until is null
     or v_until <= now()
     or coalesce(v_multiplier, 1) <= 1 then

    /*
     * Clean expired boost.
     */
    update public.user_stats
    set
      xp_boost_until = null,
      xp_boost_multiplier = 1,
      updated_at = now()
    where user_id = v_user_id
      and (
        xp_boost_until is not null
        or coalesce(xp_boost_multiplier, 1) <> 1
      );

    return jsonb_build_object(
      'active', false,
      'multiplier', 1,
      'until', null,
      'remaining_seconds', 0
    );
  end if;

  v_remaining_seconds :=
    greatest(
      0,
      floor(
        extract(
          epoch from (v_until - now())
        )
      )::bigint
    );

  return jsonb_build_object(
    'active', true,
    'multiplier', v_multiplier,
    'until', v_until,
    'remaining_seconds', v_remaining_seconds
  );

end;
$function$


CREATE OR REPLACE FUNCTION public.get_league_leaderboard(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH params AS (
    SELECT
      GREATEST(COALESCE(p_page, 1), 1) AS page,
      LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 100) AS page_size
  ),
  active_week AS (
    SELECT lw.id
    FROM public.league_weeks AS lw
    WHERE lw.status = 'ACTIVE'
      AND CURRENT_DATE BETWEEN lw.week_start AND lw.week_end
      AND EXISTS (
        SELECT 1
        FROM public.league_members AS my_membership
        WHERE my_membership.league_week_id = lw.id
          AND my_membership.user_id = auth.uid()
      )
    ORDER BY lw.week_start DESC, lw.id DESC
    LIMIT 1
  ),
  ranked AS (
    SELECT
      lm.user_id,
      COALESCE(p.username, p.full_name, 'Learner') AS username,
      p.full_name,
      p.avatar_url,
      lm.weekly_xp,
      RANK() OVER (ORDER BY lm.weekly_xp DESC, lm.user_id) AS rank,
      ROW_NUMBER() OVER (ORDER BY lm.weekly_xp DESC, lm.user_id) AS row_number
    FROM public.league_members AS lm
    JOIN active_week AS aw ON aw.id = lm.league_week_id
    LEFT JOIN public.profiles AS p ON p.id = lm.user_id
  ),
  totals AS (
    SELECT COUNT(*)::integer AS total_count
    FROM ranked
  ),
  paged AS (
    SELECT r.*
    FROM ranked AS r
    CROSS JOIN params AS x
    WHERE r.row_number > ((x.page - 1) * x.page_size)
      AND r.row_number <= (x.page * x.page_size)
  )
  SELECT jsonb_build_object(
    'rows', COALESCE(
      (SELECT jsonb_agg(
        (to_jsonb(paged) - 'row_number')
        ORDER BY paged.rank, paged.user_id
      ) FROM paged),
      '[]'::jsonb
    ),
    'page', x.page,
    'page_size', x.page_size,
    'total_count', t.total_count,
    'total_pages', CASE
      WHEN t.total_count = 0 THEN 0
      ELSE CEIL(t.total_count::numeric / x.page_size)::integer
    END,
    'has_more', (x.page * x.page_size) < t.total_count
  )
  FROM params AS x
  CROSS JOIN totals AS t;
$function$


CREATE OR REPLACE FUNCTION public.get_current_user_league()
 RETURNS TABLE(league_id bigint, league_code text, league_name text, league_order integer, league_week_id bigint, weekly_xp integer, user_rank integer, promoted boolean, demoted boolean, advances_to_finals boolean, end_at timestamp with time zone, ends_in_seconds bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with current_league as (
    select
      l.id as league_id,
      l.code as league_code,
      l.name as league_name,
      l.league_order,
      lw.id as league_week_id,
      lm.weekly_xp,
      lm.rank as user_rank,
      lm.promoted,
      lm.demoted,
      (coalesce(lm.rank, 999999) <= 10) as advances_to_finals,
      timezone('UTC', ((lw.week_end + 1)::timestamp)) as end_at
    from public.league_members as lm
    join public.league_weeks as lw
      on lw.id = lm.league_week_id
    join public.leagues as l
      on l.id = lw.league_id
    where lm.user_id = (select auth.uid())
      and lw.status = 'ACTIVE'
      and lw.week_start <= (now() at time zone 'UTC')::date
      and lw.week_end >= (now() at time zone 'UTC')::date
      and l.is_active = true
    order by lw.week_start desc, lw.id desc
    limit 1
  )
  select
    cl.league_id,
    cl.league_code,
    cl.league_name,
    cl.league_order,
    cl.league_week_id,
    cl.weekly_xp,
    cl.user_rank,
    cl.promoted,
    cl.demoted,
    cl.advances_to_finals,
    cl.end_at,
    greatest(extract(epoch from (cl.end_at - now()))::bigint, 0) as ends_in_seconds
  from current_league as cl;
$function$


CREATE OR REPLACE FUNCTION public.admin_create_shop_item(p_code text, p_name text, p_description text, p_item_type text, p_gem_price bigint, p_quantity integer DEFAULT 1, p_icon_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare s public.shop_items;
begin
  perform public.admin_require('content');
  if nullif(trim(p_code),'') is null or nullif(trim(p_name),'') is null then raise exception 'SHOP_REQUIRED_FIELDS_MISSING'; end if;
  if p_gem_price<=0 or p_quantity<=0 then raise exception 'INVALID_SHOP_VALUES'; end if;
  insert into public.shop_items(code,name,description,item_type,gem_price,quantity,icon_url,metadata,is_active)
  values(trim(p_code),trim(p_name),p_description,trim(p_item_type),p_gem_price,p_quantity,p_icon_url,coalesce(p_metadata,'{}'::jsonb),p_is_active) returning * into s;
  perform public.admin_audit('CREATE','shop_item',s.id::text,null,to_jsonb(s)); return to_jsonb(s);
exception when unique_violation then raise exception 'SHOP_CODE_ALREADY_EXISTS';
end; $function$


CREATE OR REPLACE FUNCTION public.admin_create_unit(p_course_id bigint, p_title text, p_description text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_icon_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v public.units; n int;
begin
  perform public.admin_require('content');
  if not exists(select 1 from public.courses where id=p_course_id) then raise exception 'COURSE_NOT_FOUND'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'UNIT_TITLE_REQUIRED'; end if;
  select coalesce(max(order_index),-1)+1 into n from public.units where course_id=p_course_id;
  insert into public.units(course_id,title,description,image_url,icon_url,order_index,metadata)
  values(p_course_id,trim(p_title),p_description,p_image_url,p_icon_url,n,coalesce(p_metadata,'{}'::jsonb)) returning * into v;
  perform public.admin_audit('CREATE','unit',v.id::text,null,to_jsonb(v)); return to_jsonb(v);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_duplicate_lesson(p_lesson_id bigint, p_new_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare s public.lessons; nrow public.lessons; q public.questions; nq public.questions; n int;
begin
  perform public.admin_require('content'); select * into s from public.lessons where id=p_lesson_id;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  select coalesce(max(order_index),-1)+1 into n from public.lessons where unit_id=s.unit_id;
  insert into public.lessons(unit_id,title,description,image_url,icon_url,order_index,xp_reward,estimated_minutes,is_published,metadata)
  values(s.unit_id,coalesce(nullif(trim(p_new_title),''),s.title||' Copy'),s.description,s.image_url,s.icon_url,n,s.xp_reward,s.estimated_minutes,false,s.metadata)
  returning * into nrow;
  for q in select * from public.questions where lesson_id=p_lesson_id order by order_index loop
    insert into public.questions(lesson_id,type,order_index,prompt,instruction,hint,explanation,image_url,target_text,target_translation,xp,difficulty,is_published,metadata,normalization_config,accepted_answers,audio_url,audio_text,audio_language,audio_speed,audio_config,speaking_config,fill_blank_config,word_bank_config,time_limit_seconds)
    values(nrow.id,q.type,q.order_index,q.prompt,q.instruction,q.hint,q.explanation,q.image_url,q.target_text,q.target_translation,q.xp,q.difficulty,false,q.metadata,q.normalization_config,q.accepted_answers,q.audio_url,q.audio_text,q.audio_language,q.audio_speed,q.audio_config,q.speaking_config,q.fill_blank_config,q.word_bank_config,q.time_limit_seconds)
    returning * into nq;
    insert into public.question_options(question_id,text,image_url,audio_url,order_index,is_correct,correct_order,metadata)
    select nq.id,text,image_url,audio_url,order_index,is_correct,correct_order,metadata from public.question_options where question_id=q.id;
  end loop;
  perform public.admin_audit('DUPLICATE','lesson',nrow.id::text,to_jsonb(s),to_jsonb(nrow));
  return public.admin_get_lesson(nrow.id);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_achievements()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$ begin perform public.admin_require('read'); return coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.achievements a),'[]'::jsonb); end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_analytics_overview(p_from date DEFAULT (CURRENT_DATE - 30), p_to date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('analytics'); if p_to<p_from then raise exception 'INVALID_DATE_RANGE'; end if;
  return jsonb_build_object('from',p_from,'to',p_to,
    'new_users',(select count(*) from auth.users where created_at>=p_from::timestamptz and created_at<(p_to+1)::timestamptz),
    'lesson_attempts',(select count(*) from public.lesson_attempts where created_at>=p_from::timestamptz and created_at<(p_to+1)::timestamptz),
    'question_attempts',(select count(*) from public.question_attempts where created_at>=p_from::timestamptz and created_at<(p_to+1)::timestamptz),
    'correct_question_attempts',(select count(*) from public.question_attempts where result='CORRECT' and created_at>=p_from::timestamptz and created_at<(p_to+1)::timestamptz),
    'xp_awarded',(select coalesce(sum(amount),0) from public.xp_transactions where created_at>=p_from::timestamptz and created_at<(p_to+1)::timestamptz),
    'gem_transactions',(select count(*) from public.gem_transactions where created_at>=p_from::timestamptz and created_at<(p_to+1)::timestamptz));
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_courses(p_search text DEFAULT NULL::text, p_active_only boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('read');
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.title)
    from (
      select c.id,c.code,c.title,c.source_language,c.target_language,c.is_active,
             c.metadata,c.created_at,c.updated_at,
             count(distinct u.id)::int unit_count,
             count(distinct l.id)::int lesson_count,
             count(distinct q.id)::int question_count,
             count(distinct q.id) filter(where q.is_published)::int published_question_count
      from public.courses c
      left join public.units u on u.course_id=c.id
      left join public.lessons l on l.unit_id=u.id
      left join public.questions q on q.lesson_id=l.id
      where (p_search is null or c.code ilike '%'||p_search||'%' or c.title ilike '%'||p_search||'%')
        and (p_active_only is null or c.is_active=p_active_only)
      group by c.id
    ) x
  ),'[]'::jsonb);
end; $function$


CREATE OR REPLACE FUNCTION public.finalize_league_week()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  v_today_utc date := (now() at time zone 'UTC')::date;

  v_next_week_start date;
  v_next_week_end date;

  v_min_order integer;
  v_max_order integer;

  v_lowest_league_id bigint;

  v_source_week_id bigint;
  v_source_league_id bigint;
  v_source_league_order integer;

  v_next_week_id bigint;

  v_last_processed_end date;

begin
  /*
   * ============================================================
   * 1. GLOBAL LEAGUE LOCK
   * ============================================================
   *
   * Prevent two cron/jobs from finalizing the same league cycle
   * at the same time.
   */
  perform pg_advisory_xact_lock(
    hashtextextended('public.finalize_league_week', 0)
  );


  /*
   * ============================================================
   * 2. FIND ACTIVE LEAGUE RANGE
   * ============================================================
   */
  select
    min(league_order),
    max(league_order)
  into
    v_min_order,
    v_max_order
  from public.leagues
  where is_active = true;


  /*
   * No active leagues -> nothing to process.
   */
  if v_min_order is null then
    return;
  end if;


  /*
   * Lowest league is used for brand-new users.
   */
  select id
  into v_lowest_league_id
  from public.leagues
  where is_active = true
    and league_order = v_min_order
  order by id
  limit 1;


  /*
   * ============================================================
   * 3. TEMP TABLE
   * ============================================================
   *
   * One row per user.
   *
   * target_league_id = league the user should enter next week.
   */
  create temporary table tmp_league_moves (
    user_id uuid primary key,
    target_league_id bigint not null
  ) on commit drop;


  /*
   * ============================================================
   * 4. PROCESS EVERY ENDED ACTIVE LEAGUE WEEK
   * ============================================================
   */
  for
    v_source_week_id,
    v_source_league_id,
    v_source_league_order
  in
    select
      lw.id,
      l.id,
      l.league_order
    from public.league_weeks lw
    join public.leagues l
      on l.id = lw.league_id
    where l.is_active = true
      and lw.status = 'ACTIVE'
      and lw.week_end <= v_today_utc
    order by
      lw.week_end,
      l.league_order,
      lw.id
  loop

    /*
     * ----------------------------------------------------------
     * 4A. CALCULATE RANK
     * ----------------------------------------------------------
     */
    with ranked as (
      select
        lm.league_week_id,
        lm.user_id,
        row_number() over (
          order by
            lm.weekly_xp desc,
            lm.user_id asc
        )::integer as calculated_rank
      from public.league_members lm
      where lm.league_week_id = v_source_week_id
    )
    update public.league_members lm
    set
      rank = ranked.calculated_rank,
      updated_at = now()
    from ranked
    where lm.league_week_id = ranked.league_week_id
      and lm.user_id = ranked.user_id;


    /*
     * ----------------------------------------------------------
     * 4B. CALCULATE PROMOTION / DEMOTION
     *
     * TOP 10       -> promotion
     * BOTTOM 10    -> demotion
     * MIDDLE       -> same league
     *
     * Boundary protection:
     *
     * Highest league cannot promote.
     * Lowest league cannot demote.
     * ----------------------------------------------------------
     */
    with member_count as (
      select count(*)::integer as total
      from public.league_members
      where league_week_id = v_source_week_id
    )
    update public.league_members lm
    set
      promoted =
        (
          lm.rank <= 10
          and v_source_league_order < v_max_order
        ),

      demoted =
        (
          lm.rank > (member_count.total - 10)
          and v_source_league_order > v_min_order
        ),

      updated_at = now()

    from member_count
    where lm.league_week_id = v_source_week_id;


    /*
     * ----------------------------------------------------------
     * 4C. CALCULATE DESTINATION LEAGUE
     *
     * promoted -> league_order + 1
     * demoted  -> league_order - 1
     * same     -> same league_order
     *
     * The CASE also protects the top/bottom boundaries.
     * ----------------------------------------------------------
     */
    insert into tmp_league_moves (
      user_id,
      target_league_id
    )
    select
      lm.user_id,
      target.id

    from public.league_members lm

    join public.leagues source
      on source.id = v_source_league_id

    join public.leagues target
      on target.is_active = true
      and target.league_order =
        case

          when lm.promoted = true
            then least(
              source.league_order + 1,
              v_max_order
            )

          when lm.demoted = true
            then greatest(
              source.league_order - 1,
              v_min_order
            )

          else
            source.league_order

        end

    where lm.league_week_id = v_source_week_id

    /*
     * If the same user somehow exists in multiple ended
     * league weeks, keep the newest processed result.
     */
    on conflict (user_id)
    do update
      set target_league_id = excluded.target_league_id;


    /*
     * ----------------------------------------------------------
     * 4D. FINALIZE SOURCE WEEK
     * ----------------------------------------------------------
     */
    update public.league_weeks
    set
      status = 'FINALIZED'
    where id = v_source_week_id
      and status = 'ACTIVE';


    /*
     * Keep track of the newest week we actually processed.
     */
    if v_last_processed_end is null
       or (
         select week_end
         from public.league_weeks
         where id = v_source_week_id
       ) > v_last_processed_end
    then

      select week_end
      into v_last_processed_end
      from public.league_weeks
      where id = v_source_week_id;

    end if;

  end loop;


  /*
   * ============================================================
   * 5. CALCULATE THE NEXT WEEK
   * ============================================================
   *
   * IMPORTANT:
   *
   * We use the week that was actually processed above.
   * We do NOT use MAX(week_end) from every historical
   * finalized week.
   *
   * This prevents old/history rows from producing the wrong
   * next-week date.
   */
  if v_last_processed_end is not null then

    v_next_week_start := v_last_processed_end + 1;

  else

    /*
     * No ended week was found.
     *
     * Make sure there is a current Monday-Sunday week.
     */
    v_next_week_start :=
      date_trunc(
        'week',
        now() at time zone 'UTC'
      )::date;

  end if;


  v_next_week_end := v_next_week_start + 6;


  /*
   * ============================================================
   * 6. CREATE NEXT WEEK FOR EVERY ACTIVE LEAGUE
   * ============================================================
   *
   * This happens even if the league has zero members.
   *
   * Therefore:
   *
   * Bronze  -> next week exists
   * Silver  -> next week exists
   * Gold    -> next week exists
   * etc.
   *
   * Running this function multiple times is safe because
   * existing week rows are reused.
   */
  for v_source_league_id in
    select id
    from public.leagues
    where is_active = true
    order by
      league_order,
      id
  loop

    select lw.id
    into v_next_week_id
    from public.league_weeks lw
    where lw.league_id = v_source_league_id
      and lw.week_start = v_next_week_start
    order by lw.id
    limit 1;


    /*
     * Create the week if it doesn't already exist.
     */
    if v_next_week_id is null then

      insert into public.league_weeks (
        league_id,
        week_start,
        week_end,
        status
      )
      values (
        v_source_league_id,
        v_next_week_start,
        v_next_week_end,
        'ACTIVE'
      )
      returning id into v_next_week_id;

    else

      /*
       * Make sure an existing row has the correct dates/status.
       */
      update public.league_weeks
      set
        week_end = v_next_week_end,
        status = 'ACTIVE'
      where id = v_next_week_id;

    end if;


    /*
     * ----------------------------------------------------------
     * 6A. ADD USERS WHO BELONG TO THIS LEAGUE
     * ----------------------------------------------------------
     */
    insert into public.league_members (
      league_week_id,
      user_id,
      weekly_xp,
      rank,
      promoted,
      demoted,
      reward_gems
    )
    select
      v_next_week_id,
      moves.user_id,
      0,
      null,
      false,
      false,
      0

    from tmp_league_moves moves

    where moves.target_league_id = v_source_league_id

    on conflict (
      league_week_id,
      user_id
    )
    do nothing;

  end loop;


  /*
   * ============================================================
   * 7. ADD BRAND-NEW USERS TO LOWEST LEAGUE
   * ============================================================
   *
   * Only users who have NEVER had a league membership are
   * considered new.
   *
   * This is safer than checking tmp_league_moves because
   * tmp_league_moves only contains users from finalized weeks.
   */
  select lw.id
  into v_next_week_id
  from public.league_weeks lw
  where lw.league_id = v_lowest_league_id
    and lw.week_start = v_next_week_start
  order by lw.id
  limit 1;


  if v_next_week_id is not null then

    insert into public.league_members (
      league_week_id,
      user_id,
      weekly_xp,
      rank,
      promoted,
      demoted,
      reward_gems
    )
    select
      v_next_week_id,
      u.id,
      0,
      null,
      false,
      false,
      0

    from auth.users u

    /*
     * User has never participated in any league.
     */
    where not exists (
      select 1
      from public.league_members lm
      where lm.user_id = u.id
    )

    on conflict (
      league_week_id,
      user_id
    )
    do nothing;

  end if;


  /*
   * ============================================================
   * 8. DONE
   * ============================================================
   */
  return;

end;$function$


CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_reward_xp integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  u uuid := auth.uid();
  d date := (now() at time zone 'UTC')::date;
  key text := 'DAILY_REWARD_XP:' || u::text || ':' || d::text;
  r jsonb;

begin

  if u is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if exists (
    select 1
    from public.xp_transactions
    where user_id = u
      and source_key = key
  ) then

    return jsonb_build_object(
      'claimed', false,
      'reason', 'ALREADY_CLAIMED',
      'total_xp', (
        select total_xp
        from public.user_stats
        where user_id = u
      ),
      'gems', (
        select balance
        from public.user_gems
        where user_id = u
      )
    );

  end if;

  r := public.grant_xp(
    p_user_id := u,
    p_amount := greatest(1, least(p_reward_xp, 100)),
    p_type := 'BONUS'::public.transaction_type,
    p_source_key := key,
    p_description := 'Daily reward',
    p_question_id := null::bigint,
    p_lesson_id := null::bigint,
    p_question_attempt_id := null::uuid,
    p_metadata := '{}'::jsonb
  );

  perform public.grant_gems(
    u,
    10,
    'DAILY_REWARD',
    'Daily reward gems',
    'DAILY_REWARD',
    d::text,
    'DAILY_REWARD:' || u::text || ':' || d::text
  );

  return jsonb_build_object(
    'claimed', true,
    'xp_awarded', (r->>'awarded')::int,
    'total_xp', (r->>'total_xp')::bigint,
    'gems', (
      select balance
      from public.user_gems
      where user_id = u
    )
  );

end;$function$


CREATE OR REPLACE FUNCTION public.admin_get_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  perform public.admin_require('read');
  return jsonb_build_object(
    'users',(select count(*) from auth.users),
    'active_users',(select count(*) from public.user_stats where last_activity_date>=current_date-30),
    'courses',(select count(*) from public.courses),
    'active_courses',(select count(*) from public.courses where is_active),
    'units',(select count(*) from public.units),
    'published_units',(select count(*) from public.units where is_published),
    'lessons',(select count(*) from public.lessons),
    'published_lessons',(select count(*) from public.lessons where is_published),
    'questions',(select count(*) from public.questions),
    'published_questions',(select count(*) from public.questions where is_published),
    'question_options',(select count(*) from public.question_options),
    'generated_at',now()
  );
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$ select public.admin_get_dashboard(); $function$


CREATE OR REPLACE FUNCTION public.admin_validate_question(p_question_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare t public.question_type; prompt_text text; target_text_value text; answers jsonb; errors jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb; opt_count int; correct_count int;
begin
  perform public.admin_require('read');
  select type,prompt,target_text,accepted_answers into t,prompt_text,target_text_value,answers from public.questions where id=p_question_id;
  if t is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  select count(*),count(*) filter(where is_correct) into opt_count,correct_count from public.question_options where question_id=p_question_id;
  if nullif(trim(coalesce(prompt_text,'')),'') is null then errors:=errors||jsonb_build_array('PROMPT_REQUIRED'); end if;
  if t='MCQ_SINGLE' and opt_count=0 then errors:=errors||jsonb_build_array('MCQ_REQUIRES_OPTIONS'); end if;
  if t='MCQ_SINGLE' and correct_count<>1 then errors:=errors||jsonb_build_array('MCQ_SINGLE_REQUIRES_ONE_CORRECT_OPTION'); end if;
  if t='MCQ_MULTI' and opt_count=0 then errors:=errors||jsonb_build_array('MCQ_REQUIRES_OPTIONS'); end if;
  if t='MCQ_MULTI' and correct_count<1 then errors:=errors||jsonb_build_array('MCQ_MULTI_REQUIRES_CORRECT_OPTION'); end if;
  if t in ('FILL_BLANK','LISTENING','SPEAKING') and nullif(trim(coalesce(target_text_value,'')),'') is null and jsonb_array_length(coalesce(answers,'[]'::jsonb))=0 then
    warnings:=warnings||jsonb_build_array('NO_CANONICAL_OR_ACCEPTED_ANSWER');
  end if;
  return jsonb_build_object('valid',jsonb_array_length(errors)=0,'errors',errors,'warnings',warnings,'question_id',p_question_id);
end; $function$


CREATE OR REPLACE FUNCTION public.admin_get_course(p_course_id bigint, p_page integer, p_page_size integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v jsonb;
  v_total bigint;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
begin
  perform public.admin_require('read');

  select count(*)
  into v_total
  from public.units u
  where u.course_id = p_course_id;

  select jsonb_build_object(
    'course', to_jsonb(c),
    'units', coalesce(
      (
        select jsonb_agg(
          to_jsonb(page_units)
          order by page_units.order_index, page_units.id
        )
        from (
          select u.*
          from public.units u
          where u.course_id = c.id
          order by u.order_index, u.id
          limit v_page_size
          offset (v_page::bigint - 1) * v_page_size
        ) as page_units
      ),
      '[]'::jsonb
    ),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_items', v_total,
      'total_pages', ceil(v_total::numeric / v_page_size)::integer,
      'has_more', v_page::bigint * v_page_size < v_total
    )
  )
  into v
  from public.courses c
  where c.id = p_course_id;

  if v is null then
    raise exception 'COURSE_NOT_FOUND';
  end if;

  return v;
end;
$function$


CREATE OR REPLACE FUNCTION public.admin_get_lessons(p_unit_id bigint, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_unit public.units%rowtype;
  v_total_count bigint;
  v_total_pages integer;
  v_lessons jsonb;
begin
  perform public.admin_require('read');

  if p_page is null or p_page < 1 then
    raise exception 'INVALID_PAGE';
  end if;
  if p_page_size is null or p_page_size < 1 or p_page_size > 100 then
    raise exception 'INVALID_PAGE_SIZE';
  end if;

  select u.*
    into v_unit
    from public.units as u
   where u.id = p_unit_id;

  if not found then
    raise exception 'UNIT_NOT_FOUND';
  end if;

  select count(*)
    into v_total_count
    from public.lessons as l
   where l.unit_id = p_unit_id;

  v_total_pages := ceil(v_total_count::numeric / p_page_size)::integer;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'lesson', to_jsonb(page_lessons),
               'question_count', (
                 select count(*)
                   from public.questions as q
                  where q.lesson_id = page_lessons.id
               ),
               'published_question_count', (
                 select count(*)
                   from public.questions as q
                  where q.lesson_id = page_lessons.id
                    and q.is_published
               )
             )
             order by page_lessons.order_index, page_lessons.id
           ),
           '[]'::jsonb
         )
    into v_lessons
    from (
      select l.*
        from public.lessons as l
       where l.unit_id = p_unit_id
       order by l.order_index, l.id
       limit p_page_size
       offset (p_page - 1)::bigint * p_page_size
    ) as page_lessons;

  return jsonb_build_object(
    'unit', to_jsonb(v_unit),
    'lessons', jsonb_build_object(
      'data', v_lessons,
      'page', p_page,
      'page_size', p_page_size,
      'total_count', v_total_count,
      'total_pages', v_total_pages,
      'has_next', p_page < v_total_pages,
      'has_previous', p_page > 1
    )
  );
end;
$function$


