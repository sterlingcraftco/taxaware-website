import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  notes: string | null;
  is_active: boolean;
  last_processed_at: string | null;
}

function calculateNextOccurrence(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'bi-weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the auth header for user-specific processing
    const authHeader = req.headers.get('Authorization');
    
    let body: { recurring_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine for batch processing
    }

    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing recurring transactions for date: ${today}`);

    let query = supabaseAdmin
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_occurrence', today);

    // If a specific recurring_id is provided, only process that one
    if (body.recurring_id) {
      console.log(`Processing specific recurring transaction: ${body.recurring_id}`);
      
      // Get user from auth header for RLS
      if (authHeader) {
        const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        query = supabaseAdmin
          .from('recurring_transactions')
          .select('*')
          .eq('id', body.recurring_id)
          .eq('user_id', user.id);
      } else {
        query = supabaseAdmin
          .from('recurring_transactions')
          .select('*')
          .eq('id', body.recurring_id);
      }
    }

    // Check for end_date
    const { data: recurringTransactions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringTransactions?.length || 0} recurring transactions to process`);

    const results: { created: number; updated: number; errors: string[] } = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const recurring of recurringTransactions || []) {
      try {
        // Skip if end_date has passed
        if (recurring.end_date && recurring.end_date < today) {
          console.log(`Skipping ${recurring.id}: end_date ${recurring.end_date} has passed`);
          
          // Deactivate it
          await supabaseAdmin
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          
          continue;
        }

        // Determine the tax year
        const occurrenceDate = new Date(recurring.next_occurrence);
        const taxYear = occurrenceDate.getFullYear();

        // Create the transaction
        const { error: insertError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: recurring.user_id,
            description: recurring.description,
            amount: recurring.amount,
            type: recurring.type,
            category_id: recurring.category_id,
            transaction_date: recurring.next_occurrence,
            notes: recurring.notes,
            is_recurring: true,
            recurring_id: recurring.id,
            tax_year: taxYear,
            status: 'completed',
          });

        if (insertError) {
          console.error(`Error creating transaction for ${recurring.id}:`, insertError);
          results.errors.push(`Failed to create transaction for ${recurring.id}: ${insertError.message}`);
          continue;
        }

        results.created++;
        console.log(`Created transaction for recurring ${recurring.id}`);

        // Calculate next occurrence
        const nextOccurrence = calculateNextOccurrence(recurring.next_occurrence, recurring.frequency);

        // Update the recurring transaction
        const { error: updateError } = await supabaseAdmin
          .from('recurring_transactions')
          .update({
            next_occurrence: nextOccurrence,
            last_processed_at: new Date().toISOString(),
          })
          .eq('id', recurring.id);

        if (updateError) {
          console.error(`Error updating recurring ${recurring.id}:`, updateError);
          results.errors.push(`Failed to update recurring ${recurring.id}: ${updateError.message}`);
          continue;
        }

        results.updated++;
        console.log(`Updated recurring ${recurring.id}, next occurrence: ${nextOccurrence}`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing recurring ${recurring.id}:`, err);
        results.errors.push(`Error processing ${recurring.id}: ${errorMsg}`);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.created} transactions`,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in process-recurring function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
