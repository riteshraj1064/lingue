import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient('https://fcwfzxwhaaocxbwobeay.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd2Z6eHdoYWFvY3hid29iZWF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM2MDI4MiwiZXhwIjoyMTAzOTM2MjgyfQ.flnqGxIW15eXV_i47cTQ-IGtp1VsLInk7G82eHKoKcs');

async function backup() {
    console.log('⏳ Pulling metadata routines using target wrapper procedure...');

    // Call the function directly on the client instance
    const { data, error } = await supabase.rpc('export_schema_elements');

    if (error) {
        console.error('❌ Query execution failed:', error.message);
        return;
    }

    let rpcOutput = '-- AUTO-GENERATED RPC METADATA\n\n';
    let enumOutput = '-- AUTO-GENERATED ENUM METADATA\n\n';

    data.forEach(item => {
        if (item.object_type === 'rpc') {
            rpcOutput += `${item.ddl_definition}\n\n`;
        } else if (item.object_type === 'enum') {
            enumOutput += `${item.ddl_definition}\n`;
        }
    });

    fs.writeFileSync('backup_rpcs.sql', rpcOutput);
    fs.writeFileSync('backup_enums.sql', enumOutput);
    console.log('✅ Extraction complete! Files successfully created.');
}

backup();
