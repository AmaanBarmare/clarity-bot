create table if not exists claims (
  id text primary key,
  text text not null,
  score integer,
  verdict text,
  explanation text,
  sources text,
  created_at timestamptz default now()
);

create table if not exists logs (
  id bigserial primary key,
  claim_id text,
  step text,
  status text,
  message text,
  ts timestamptz default now()
);

create table if not exists trends (
  week text primary key,
  total integer default 0,
  false_pct real default 0,
  mislead_pct real default 0,
  unverified_pct real default 0,
  true_pct real default 0,
  avg_score real default 0
);
