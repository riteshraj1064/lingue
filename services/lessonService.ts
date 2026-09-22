// services/submitQuestionAnswer.ts

import { supabase } from "./supabase";

/**
 * Supported question types from the curriculum.
 */
export type QuestionType =
    | "MCQ_SINGLE"
    | "MCQ_MULTI"
    | "WORD_BANK"
    | "FILL_BLANK"
    | "TRANSLATE"
    | "TEXT_INPUT"
    | "LISTENING"
    | "SPEAKING";

/**
 * Parameters accepted by the universal answer submitter.
 *
 * MCQ_SINGLE / LISTENING
 *   -> optionId
 *
 * MCQ_MULTI
 *   -> optionIds
 *
 * WORD_BANK / FILL_BLANK / TRANSLATE / TEXT_INPUT / SPEAKING
 *   -> text
 *
 * skipped
 *   -> true when user skips the question
 */
export type SubmitQuestionAnswerParams = {
    attemptId: string;
    questionId: number;

    optionId?: number;
    optionIds?: number[];

    text?: string;

    skipped?: boolean;
};

/**
 * Response returned by the submit-question-answer Edge Function.
 *
 * Keep this flexible because the exact RPC response depends on
 * your current submit_question_answer SQL function.
 */
export type SubmitQuestionAnswerResponse = {
    success?: boolean;

    correct?: boolean;

    is_correct?: boolean;

    skipped?: boolean;

    timeout?: boolean;

    xp_earned?: number;
    xp?: number;

    hearts?: number;
    hearts_lost?: number;

    question_id?: number;
    attempt_id?: string;

    current_question_order?: number;

    next_question?: unknown;
    question?: unknown;

    lesson_completed?: boolean;
    completed?: boolean;

    [key: string]: unknown;
};

/**
 * Submit an answer to the Supabase Edge Function.
 *
 * This is the ONLY function your screens need to call.
 */
export async function submitQuestionAnswer(
    params: SubmitQuestionAnswerParams
): Promise<SubmitQuestionAnswerResponse> {
    const {
        attemptId,
        questionId,
        optionId,
        optionIds,
        text,
        skipped = false,
    } = params;

    // ------------------------------------------------------------
    // Basic validation
    // ------------------------------------------------------------

    if (!attemptId || typeof attemptId !== "string") {
        throw new Error("INVALID_ATTEMPT_ID");
    }

    if (!questionId || typeof questionId !== "number") {
        throw new Error("INVALID_QUESTION_ID");
    }

    // ------------------------------------------------------------
    // Validate answer payload
    // ------------------------------------------------------------

    if (!skipped) {
        const hasOptionId = optionId !== undefined;
        const hasOptionIds =
            Array.isArray(optionIds) && optionIds.length > 0;

        const hasText =
            typeof text === "string" && text.trim().length > 0;

        if (!hasOptionId && !hasOptionIds && !hasText) {
            throw new Error("ANSWER_REQUIRED");
        }
    }

    function generateRequestId(): string {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = Math.floor(Math.random() * 16);
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    // ------------------------------------------------------------
    // Build Edge Function payload
    // ------------------------------------------------------------

    const requestId = generateRequestId();

    console.log("REQUEST ID", requestId);

    const body: Record<string, unknown> = {
        attempt_id: attemptId,
        question_id: questionId,
        request_id: requestId,
    };

    // MCQ_SINGLE / LISTENING
    if (optionId !== undefined) {
        body.option_id = optionId;
    }

    // MCQ_MULTI
    if (optionIds !== undefined) {
        body.option_ids = optionIds;
    }

    // WORD_BANK / FILL_BLANK / TRANSLATE /
    // TEXT_INPUT / LISTENING-TEXT / SPEAKING-TEXT
    if (text !== undefined) {
        body.text = text;
    }

    // Skip question
    if (skipped) {
        body.skipped = true;
    }

    // ------------------------------------------------------------
    // Call Supabase Edge Function
    // ------------------------------------------------------------

    console.log('body', body)

    const { data, error } = await supabase.functions.invoke(
        "submit-answer",
        {
            body,
        }
    );

    // ------------------------------------------------------------
    // Supabase function/network error
    // ------------------------------------------------------------

    if (error) {
        console.error(
            "submit-question-answer error:",
            error
        );

        throw error;
    }

    // ------------------------------------------------------------
    // Edge Function returned an application error
    // ------------------------------------------------------------

    if (data?.error) {
        const errorCode =
            typeof data.error === "string"
                ? data.error
                : data.error?.code;

        throw new Error(
            errorCode || "SUBMIT_ANSWER_FAILED"
        );
    }

    // ------------------------------------------------------------
    // Success
    // ------------------------------------------------------------

    return data as SubmitQuestionAnswerResponse;
}

/**
 * ------------------------------------------------------------
 * Convenience helpers
 * ------------------------------------------------------------
 */

/**
 * MCQ_SINGLE
 */
export function submitMcqSingleAnswer(
    attemptId: string,
    questionId: number,
    optionId: number
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        optionId,
    });
}

/**
 * MCQ_MULTI
 */
export function submitMcqMultiAnswer(
    attemptId: string,
    questionId: number,
    optionIds: number[]
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        optionIds,
    });
}

/**
 * WORD_BANK
 */
export function submitWordBankAnswer(
    attemptId: string,
    questionId: number,
    words: string[]
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        text: words.join(" "),
    });
}

/**
 * FILL_BLANK
 */
export function submitFillBlankAnswer(
    attemptId: string,
    questionId: number,
    answer: string
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        text: answer,
    });
}

/**
 * TRANSLATE
 */
export function submitTranslationAnswer(
    attemptId: string,
    questionId: number,
    answer: string
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        text: answer,
    });
}

/**
 * TEXT_INPUT
 */
export function submitTextInputAnswer(
    attemptId: string,
    questionId: number,
    answer: string
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        text: answer,
    });
}

/**
 * LISTENING
 *
 * IMPORTANT:
 * The audio is played by the frontend.
 * The answer sent to the backend is TEXT.
 *
 * Example:
 * User hears:
 *   "Hello"
 *
 * User types:
 *   "नमस्ते"
 *
 * Backend receives:
 *   {
 *     text: "नमस्ते"
 *   }
 */
export function submitListeningAnswer(
    attemptId: string,
    questionId: number,
    answer: string
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        text: answer,
    });
}

/**
 * SPEAKING
 *
 * This version also sends the already-created transcript
 * as TEXT instead of uploading an audio file.
 *
 * Example:
 * Speech recognition gives:
 *   "Hello how are you"
 *
 * Backend receives:
 *   {
 *     text: "Hello how are you"
 *   }
 */
export function submitSpeakingAnswer(
    attemptId: string,
    questionId: number,
    transcript: string
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        text: transcript,
    });
}

/**
 * Skip question
 */
export function skipQuestion(
    attemptId: string,
    questionId: number
) {
    return submitQuestionAnswer({
        attemptId,
        questionId,
        skipped: true,
    });
}

/**
 * ------------------------------------------------------------
 * Universal question-type function
 * ------------------------------------------------------------
 *
 * You can use this from your lesson screen.
 */
export async function submitAnswerForQuestion(
    questionType: QuestionType,
    params: {
        attemptId: string;
        questionId: number;

        optionId?: number;
        optionIds?: number[];

        text?: string;

        words?: string[];

        skipped?: boolean;
    }
): Promise<SubmitQuestionAnswerResponse> {
    const {
        attemptId,
        questionId,
        optionId,
        optionIds,
        text,
        words,
        skipped = false,
    } = params;

    // ------------------------------------------------------------
    // Skip
    // ------------------------------------------------------------

    if (skipped) {
        return skipQuestion(
            attemptId,
            questionId
        );
    }

    // ------------------------------------------------------------
    // MCQ_SINGLE
    // ------------------------------------------------------------

    if (questionType === "MCQ_SINGLE") {
        if (optionId === undefined) {
            throw new Error("OPTION_REQUIRED");
        }

        return submitMcqSingleAnswer(
            attemptId,
            questionId,
            optionId
        );
    }

    // ------------------------------------------------------------
    // LISTENING
    //
    // Either optionId (for MCQ) or text (for typed input).
    // ------------------------------------------------------------

    if (questionType === "LISTENING") {
        if (optionId !== undefined) {
            return submitMcqSingleAnswer(
                attemptId,
                questionId,
                optionId
            );
        }

        if (!text?.trim()) {
            throw new Error("ANSWER_REQUIRED");
        }

        return submitListeningAnswer(
            attemptId,
            questionId,
            text
        );
    }

    // ------------------------------------------------------------
    // MCQ_MULTI
    // ------------------------------------------------------------

    if (questionType === "MCQ_MULTI") {
        if (!optionIds || optionIds.length === 0) {
            throw new Error("OPTIONS_REQUIRED");
        }

        return submitMcqMultiAnswer(
            attemptId,
            questionId,
            optionIds
        );
    }

    // ------------------------------------------------------------
    // WORD_BANK
    // ------------------------------------------------------------

    if (questionType === "WORD_BANK") {
        if (words && words.length > 0) {
            return submitWordBankAnswer(
                attemptId,
                questionId,
                words
            );
        }

        if (text?.trim()) {
            return submitQuestionAnswer({
                attemptId,
                questionId,
                text,
            });
        }

        throw new Error("ANSWER_REQUIRED");
    }

    // ------------------------------------------------------------
    // FILL_BLANK
    // ------------------------------------------------------------

    if (questionType === "FILL_BLANK") {
        if (!text?.trim()) {
            throw new Error("ANSWER_REQUIRED");
        }

        return submitFillBlankAnswer(
            attemptId,
            questionId,
            text
        );
    }

    // ------------------------------------------------------------
    // TRANSLATE
    // ------------------------------------------------------------

    if (questionType === "TRANSLATE") {
        if (!text?.trim()) {
            throw new Error("ANSWER_REQUIRED");
        }

        return submitTranslationAnswer(
            attemptId,
            questionId,
            text
        );
    }

    // ------------------------------------------------------------
    // TEXT_INPUT
    // ------------------------------------------------------------

    if (questionType === "TEXT_INPUT") {
        if (!text?.trim()) {
            throw new Error("ANSWER_REQUIRED");
        }

        return submitTextInputAnswer(
            attemptId,
            questionId,
            text
        );
    }

    // ------------------------------------------------------------
    // SPEAKING
    //
    // Sends transcript as TEXT.
    // No audio file is uploaded.
    // ------------------------------------------------------------

    if (questionType === "SPEAKING") {
        if (!text?.trim()) {
            throw new Error("ANSWER_REQUIRED");
        }

        return submitSpeakingAnswer(
            attemptId,
            questionId,
            text
        );
    }

    throw new Error(
        `UNSUPPORTED_QUESTION_TYPE: ${questionType}`
    );
}