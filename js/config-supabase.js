// js/config-supabase.js
// Supabase configuration for the browser.
//
// In a Vercel deployment with NEXT_PUBLIC_* environment variables, Vercel
// inlines their values as literal strings at build time. For plain static
// hosting the values must be written into this file (or injected via a
// server-side template) before deployment.
//
// IMPORTANT: the ANON key is a *public* key designed to be exposed in the
// browser. Protect your data using Row Level Security (RLS) in Supabase
// instead of hiding this key.
(function () {
  // Replace these placeholder values with real values before deploying.
  // On Vercel the build system substitutes NEXT_PUBLIC_* vars automatically.
  var supabaseUrl = 'https://nlecdtjvsqttpimcyzxp.supabase.co';
  var supabaseAnonKey = '';   // set via Vercel env: NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseAnonKey) {
    console.warn(
      '[Supabase] ANON key is not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables. ' +
      'Authentication will be unavailable until this is resolved.'
    );
  }

  window.SUPABASE_CONFIG = {
    URL: supabaseUrl,
    ANON_KEY: supabaseAnonKey
  };
})();
