create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null check (char_length(display_name) between 1 and 100),
	role text not null default 'student' check (role in ('student', 'admin')),
	created_at timestamptz not null default now()
);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.profiles
		where id = (select auth.uid()) and role = 'admin'
	);
$$;

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, display_name)
	values (
		new.id,
		coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
	);
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute procedure public.create_profile_for_auth_user();

create table public.study_preferences (
	user_id uuid not null references public.profiles (id) on delete cascade,
	activity text not null check (activity in ('vocabulary', 'expressions', 'conjugation')),
	settings jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now(),
	primary key (user_id, activity)
);

create table public.activity_sessions (
	id uuid primary key,
	user_id uuid not null references public.profiles (id) on delete cascade,
	module text not null check (module in (
		'vocabulaire-definition', 'vocabulaire-mot',
		'expressions-word-to-definition', 'expressions-definition-to-word', 'conjugaison'
	)),
	score text not null check (score ~ '^[0-9]{1,4}/[0-9]{1,4}$'),
	created_at timestamptz not null default now(),
	unique (user_id, id)
);

create index activity_sessions_user_created_idx
	on public.activity_sessions (user_id, created_at desc);

create table public.answer_attempts (
	id bigint generated always as identity primary key,
	session_id uuid not null references public.activity_sessions (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	position smallint not null check (position >= 0),
	item_id text not null,
	module text not null,
	direction text check (direction in ('word-to-definition', 'definition-to-word')),
	mode text check (mode in ('self-assessment', 'multiple-choice')),
	response text not null default '',
	correction jsonb not null,
	is_correct boolean not null,
	details jsonb,
	created_at timestamptz not null default now(),
	unique (session_id, position)
);

create index answer_attempts_user_recent_idx
	on public.answer_attempts (user_id, is_correct, created_at desc);

create table public.item_reviews (
	user_id uuid not null references public.profiles (id) on delete cascade,
	item_id text not null,
	direction text not null check (direction in ('word-to-definition', 'definition-to-word', 'conjugation')),
	consecutive_correct integer not null default 0 check (consecutive_correct >= 0),
	last_result boolean not null,
	next_review_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (user_id, item_id, direction)
);

create function public.record_activity_session(
	p_session_id uuid,
	p_module text,
	p_score text,
	p_attempts jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
	inserted_id uuid;
	attempt jsonb;
	position_index smallint := 0;
	direction_key text;
begin
	insert into public.activity_sessions (id, user_id, module, score)
	values (p_session_id, auth.uid(), p_module, p_score)
	on conflict (id) do nothing
	returning id into inserted_id;

	if inserted_id is null then
		return false;
	end if;

	for attempt in
		select value from jsonb_array_elements(coalesce(p_attempts, '[]'::jsonb)) as entries(value)
	loop
		direction_key := coalesce(attempt ->> 'direction', 'conjugation');
		insert into public.answer_attempts (
			session_id, user_id, position, item_id, module, direction, mode,
			response, correction, is_correct, details
		) values (
			p_session_id,
			auth.uid(),
			position_index,
			attempt ->> 'item_id',
			p_module,
			nullif(attempt ->> 'direction', ''),
			nullif(attempt ->> 'mode', ''),
			coalesce(attempt ->> 'response', ''),
			attempt -> 'correction',
			coalesce((attempt ->> 'is_correct')::boolean, false),
			nullif(attempt -> 'details', 'null'::jsonb)
		);

		insert into public.item_reviews (
			user_id, item_id, direction, consecutive_correct, last_result, next_review_at
		) values (
			auth.uid(),
			attempt ->> 'item_id',
			direction_key,
			case when coalesce((attempt ->> 'is_correct')::boolean, false) then 1 else 0 end,
			coalesce((attempt ->> 'is_correct')::boolean, false),
			case
				when coalesce((attempt ->> 'is_correct')::boolean, false) then now() + interval '1 day'
				else now()
			end
		)
		on conflict (user_id, item_id, direction) do update set
			consecutive_correct = case
				when excluded.last_result then public.item_reviews.consecutive_correct + 1
				else 0
			end,
			last_result = excluded.last_result,
			next_review_at = case
				when excluded.last_result then now() + case
					when public.item_reviews.consecutive_correct + 1 = 1 then interval '1 day'
					when public.item_reviews.consecutive_correct + 1 = 2 then interval '3 days'
					when public.item_reviews.consecutive_correct + 1 = 3 then interval '7 days'
					else interval '14 days'
				end
				else now()
			end,
			updated_at = now();

		position_index := position_index + 1;
	end loop;

	return true;
end;
$$;

alter table public.profiles enable row level security;
alter table public.study_preferences enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.answer_attempts enable row level security;
alter table public.item_reviews enable row level security;

create policy "Users and admins can read profiles"
	on public.profiles for select
	using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users manage their preferences"
	on public.study_preferences for all
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

create policy "Users and admins read activity sessions"
	on public.activity_sessions for select
	using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users create their own activity sessions"
	on public.activity_sessions for insert
	with check (user_id = (select auth.uid()));

create policy "Users and admins read answer attempts"
	on public.answer_attempts for select
	using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users create their own answer attempts"
	on public.answer_attempts for insert
	with check (
		user_id = (select auth.uid())
		and exists (
			select 1 from public.activity_sessions
			where id = session_id and user_id = (select auth.uid())
		)
	);

create policy "Users manage their item reviews"
	on public.item_reviews for all
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.study_preferences to authenticated;
grant select, insert on public.activity_sessions to authenticated;
grant select, insert on public.answer_attempts to authenticated;
grant select, insert, update, delete on public.item_reviews to authenticated;
grant usage, select on sequence public.answer_attempts_id_seq to authenticated;
grant execute on function public.record_activity_session(uuid, text, text, jsonb) to authenticated;
