-- Create profiles table to store onboarding data and preferences
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  goals text,
  risk_tolerance int,
  monthly_income numeric,
  currency text default 'INR',
  onboarding_complete boolean default false,
  updated_at timestamptz default now()
);
