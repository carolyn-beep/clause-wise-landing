-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  source_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contracts
CREATE POLICY "Users can view their own contracts" 
ON public.contracts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contracts" 
ON public.contracts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts" 
ON public.contracts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create analyses table
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  overall_risk TEXT NOT NULL CHECK (overall_risk IN ('low','medium','high')),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on analyses
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analyses
CREATE POLICY "Users can view their own analyses" 
ON public.analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
ON public.analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
ON public.analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create flags table
CREATE TABLE public.flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  clause TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  rationale TEXT,
  suggestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on flags
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for flags
CREATE POLICY "Users can view their own flags" 
ON public.flags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flags" 
ON public.flags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flags" 
ON public.flags 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flags" 
ON public.flags 
FOR DELETE 
USING (auth.uid() = user_id);