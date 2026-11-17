-- CPA 재무관리 웹앱 · Supabase 스키마 (여러 번 실행해도 안전)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run.
-- 행 수준 보안(RLS): 일반 사용자는 자기 기록만, 관리자(role='admin')는 전체 기록을 읽을 수 있다.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.progress (            -- 문제별 회독·복습 상태 (pid='_settings'는 개인 설정)
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pid text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, pid)
);

create table if not exists public.mock_results (        -- 모의고사 결과
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (         -- 관리자가 배정한 단원
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  unit text not null,
  note text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 관리자 여부 (RLS 정책 안에서 profiles를 다시 조회할 때 재귀를 피하려고 security definer)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 계정을 만들면 profiles 행을 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
-- 이 스키마보다 먼저 만든 계정도 profiles에 등록
insert into public.profiles (id, name)
  select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)) from auth.users
  on conflict (id) do nothing;

alter table public.profiles     enable row level security;
alter table public.progress     enable row level security;
alter table public.mock_results enable row level security;
alter table public.assignments  enable row level security;

-- profiles: 본인·관리자만 조회, 수정은 관리자만 (일반 사용자가 스스로 admin이 되는 것을 막음)
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update using (public.is_admin());

-- progress: 본인 것만 쓰기, 조회는 본인·관리자
drop policy if exists "progress_select" on public.progress;
create policy "progress_select" on public.progress for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "progress_insert" on public.progress;
create policy "progress_insert" on public.progress for insert with check (user_id = auth.uid());
drop policy if exists "progress_update" on public.progress;
create policy "progress_update" on public.progress for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "progress_delete" on public.progress;
create policy "progress_delete" on public.progress for delete using (user_id = auth.uid());

-- mock_results: 위와 같음
drop policy if exists "mock_select" on public.mock_results;
create policy "mock_select" on public.mock_results for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "mock_insert" on public.mock_results;
create policy "mock_insert" on public.mock_results for insert with check (user_id = auth.uid());
drop policy if exists "mock_update" on public.mock_results;
create policy "mock_update" on public.mock_results for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- assignments: 본인 배정만 조회, 배정·해제는 관리자만
drop policy if exists "assign_select" on public.assignments;
create policy "assign_select" on public.assignments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "assign_insert" on public.assignments;
create policy "assign_insert" on public.assignments for insert with check (public.is_admin());
drop policy if exists "assign_update" on public.assignments;
create policy "assign_update" on public.assignments for update using (public.is_admin());
drop policy if exists "assign_delete" on public.assignments;
create policy "assign_delete" on public.assignments for delete using (public.is_admin());

-- ▼ 계정을 만든 뒤 한 번 실행: 내 계정을 관리자로 (이메일을 바꿔서)
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'me@example.com');
-- ▼ 표시 이름 바꾸기
-- update public.profiles set name = '김가천' where id = (select id from auth.users where email = 'friend1@example.com');

-- ═══════════ 출석 인증 (08–10시 · 12–14시 · 18–20시, 한국시각) ═══════════
-- 사진은 비공개 저장소 'attendance'에 '사용자ID/날짜-블록.jpg'로 저장한다.
-- 본인은 자기 기록·사진만, 관리자는 전원의 기록·사진을 볼 수 있다. 다른 사용자끼리는 서로 볼 수 없다.
create table if not exists public.attendance (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  block smallint not null check (block between 1 and 3),
  photo_path text not null,
  taken_at timestamptz not null default now(),
  unique (user_id, day, block)
);

-- 지금(서버 시각, 한국시각 기준)이 몇 번째 출석 블록인지 (블록 밖이면 null) — 기기 시계를 바꿔도 소용없게 서버에서 판단
create or replace function public.current_block() returns smallint
language sql stable as $$
  select case
    when t >= time '08:00' and t < time '10:00' then 1
    when t >= time '12:00' and t < time '14:00' then 2
    when t >= time '18:00' and t < time '20:00' then 3
  end::smallint
  from (select (now() at time zone 'Asia/Seoul')::time as t) s;
$$;

alter table public.attendance drop constraint if exists attendance_photo_path_chk;
alter table public.attendance add constraint attendance_photo_path_chk
  check (photo_path = user_id::text || '/' || day::text || '-' || block::text || '.jpg');

alter table public.attendance enable row level security;
drop policy if exists "att_select" on public.attendance;
create policy "att_select" on public.attendance for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "att_insert" on public.attendance;
create policy "att_insert" on public.attendance for insert with check (
  user_id = auth.uid() and day = (now() at time zone 'Asia/Seoul')::date and block = public.current_block());
drop policy if exists "att_delete" on public.attendance;
create policy "att_delete" on public.attendance for delete using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('attendance', 'attendance', false, 1048576, array['image/jpeg'])
  on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];
drop policy if exists "att_photo_insert" on storage.objects;
create policy "att_photo_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'attendance' and name ~ ('^' || auth.uid()::text || '/\d{4}-\d{2}-\d{2}-[1-3]\.jpg$') and public.current_block() is not null);
drop policy if exists "att_photo_select" on storage.objects;
create policy "att_photo_select" on storage.objects for select to authenticated using (
  bucket_id = 'attendance' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "att_photo_delete" on storage.objects;
drop policy if exists "att_photo_update" on storage.objects;
create policy "att_photo_update" on storage.objects for update to authenticated using (
  bucket_id = 'attendance' and (storage.foldername(name))[1] = auth.uid()::text and public.current_block() is not null)
  with check (bucket_id = 'attendance' and name ~ ('^' || auth.uid()::text || '/\d{4}-\d{2}-\d{2}-[1-3]\.jpg$'));
create policy "att_photo_delete" on storage.objects for delete to authenticated using (bucket_id = 'attendance' and public.is_admin());

-- ═══════════ 접속 현황 (Realtime 비공개 채널 'online-users') ═══════════
-- 로그인한 사용자만 접속 현황을 보고 보낼 수 있다. 대시보드 Realtime → Settings에서
-- 'Allow public access'를 꺼야 로그인하지 않은 사람의 접속이 완전히 막힌다.
drop policy if exists "presence_read" on realtime.messages;
create policy "presence_read" on realtime.messages for select to authenticated using (
  (select realtime.topic()) = 'online-users' and realtime.messages.extension in ('broadcast', 'presence'));
drop policy if exists "presence_write" on realtime.messages;
create policy "presence_write" on realtime.messages for insert to authenticated with check (
  (select realtime.topic()) = 'online-users' and realtime.messages.extension in ('broadcast', 'presence'));

-- ═══════════ 과목 (사용자별로 볼 수 있는 과목 팩) ═══════════
-- fm2 = CPA 2차 재무관리, fm1 = CPA 1차 재무관리, net = 네트워크관리사 2급 필기. 관리자는 모든 과목을 본다.
-- 관리자 화면의 '과목 저장'으로 바꿀 수 있다 (profiles는 관리자만 수정 가능).
alter table public.profiles add column if not exists subjects text[] not null default '{fm2}';
-- 예시: 특정 사용자에게 다른 과목을 지정하려면 이름을 바꿔서 실행한다.
-- update public.profiles set subjects = '{fm1}' where name = '사용자이름';

-- ═══════════ 메신저 (전체 대화방 'all' + 1:1 대화 'dm:작은ID:큰ID') ═══════════
-- 전체 대화방은 로그인한 모든 사용자, 1:1 대화는 두 사람만 읽고 쓸 수 있다 (관리자도 남의 1:1 대화는 못 봄).
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room text not null check (room = 'all' or room ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'),
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_id on public.messages (room, id);
alter table public.messages enable row level security;
drop policy if exists "msg_select" on public.messages;
create policy "msg_select" on public.messages for select to authenticated using (
  room = 'all' or auth.uid()::text in (split_part(room, ':', 2), split_part(room, ':', 3)));
-- 1:1 상대가 실제 사용자인지 확인. profiles는 본인 것만 보이므로(관리자 제외) 정책 안에서 직접 조회하면
-- 일반 사용자는 상대를 못 찾아 1:1 메시지를 못 보낸다 → 권한을 높인 함수로 확인
create or replace function public.chat_peer_ok(p_room text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id::text in (split_part(p_room, ':', 2), split_part(p_room, ':', 3)) and p.id <> auth.uid());
$$;
drop policy if exists "msg_insert" on public.messages;
create policy "msg_insert" on public.messages for insert to authenticated with check (
  sender = auth.uid() and (room = 'all' or (
    split_part(room, ':', 2) < split_part(room, ':', 3)
    and auth.uid()::text in (split_part(room, ':', 2), split_part(room, ':', 3))
    and public.chat_peer_ok(room))));

-- 대화 상대 목록 (이름만): profiles는 본인 것만 보이므로 이름·ID만 돌려주는 함수
create or replace function public.chat_members() returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select id, name from public.profiles where auth.uid() is not null order by created_at;
$$;

-- 새 메시지를 받는 사람의 비공개 채널로 실시간 전달 ('chat:all' 또는 'chat:u:사용자ID')
create or replace function public.chat_broadcast() returns trigger
language plpgsql security definer set search_path = public as $$
declare p jsonb := jsonb_build_object('id', new.id, 'room', new.room, 'sender', new.sender, 'body', new.body, 'created_at', new.created_at);
begin
  begin
    if new.room = 'all' then
      perform realtime.send(p, 'msg', 'chat:all', true);
    else
      perform realtime.send(p, 'msg', 'chat:u:' || split_part(new.room, ':', 2), true);
      perform realtime.send(p, 'msg', 'chat:u:' || split_part(new.room, ':', 3), true);
    end if;
  exception when others then null;   -- 실시간 전달이 실패해도 메시지 저장은 그대로 (앱이 15초마다 새 메시지를 다시 확인)
  end;
  return new;
end;
$$;
drop trigger if exists on_message_created on public.messages;
create trigger on_message_created after insert on public.messages for each row execute function public.chat_broadcast();

-- ═══════════ 메신저 알림 (웹 푸시) ═══════════
-- 기기마다 알림 구독(endpoint·키)을 저장하고, 새 메시지가 오면 받는 사람의 기기들로 Cloudflare Worker(/api/push)를 통해 보낸다.
-- VAPID 비밀키와 Worker 주소는 push_config 표에만 둔다 (이 파일에는 없음, 아무 사용자도 읽을 수 없음).
create extension if not exists pg_net with schema extensions;
create table if not exists public.push_config (k text primary key, v jsonb not null);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
create table if not exists public.push_subs (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) < 1000),
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) < 200),
  auth text not null check (char_length(auth) < 100),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;   -- 정책 없음: 아래 함수로만 등록·해제
revoke all on public.push_subs from anon, authenticated;
-- 같은 기기(endpoint)를 다른 계정이 쓰면 마지막에 로그인해 켠 사람 것으로 바뀐다
create or replace function public.push_register(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  insert into push_subs (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
end;
$$;
create or replace function public.push_unregister(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.push_register(text, text, text), public.push_unregister(text) from public, anon;
grant execute on function public.push_register(text, text, text), public.push_unregister(text) to authenticated;

create or replace function public.chat_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; subs jsonb; nm text;
begin
  begin
    select v into cfg from push_config where k = 'vapid';
    if cfg is null then return new; end if;
    begin   -- 지난번 전달에서 '끊긴 기기'로 돌아온 구독 정리 (pg_net 응답 기록은 몇 시간 남아 있음)
      delete from push_subs where endpoint in (select jsonb_array_elements_text(r.content::jsonb -> 'gone')
        from net._http_response r where r.status_code = 200 and r.content like '{"status"%');
    exception when others then null;
    end;
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb) into subs
    from (select * from push_subs x where x.user_id <> new.sender and x.updated_at > now() - interval '60 days'
            and (new.room = 'all' or x.user_id::text in (split_part(new.room, ':', 2), split_part(new.room, ':', 3)))
          order by x.updated_at desc limit 50) s;
    if jsonb_array_length(subs) = 0 then return new; end if;
    select name into nm from profiles where id = new.sender;
    perform net.http_post(url := cfg->>'relay', headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('vapid', cfg - 'relay', 'subs', subs, 'msg', jsonb_build_object(
        'title', coalesce(nullif(nm, ''), '새 메시지') || case when new.room = 'all' then ' · 전체 대화방' else '' end,
        'body', left(new.body, 120), 'room', new.room, 'id', new.id)));
  exception when others then null;   -- 알림 전달이 실패해도 메시지 저장은 그대로
  end;
  return new;
end;
$$;
drop trigger if exists on_message_push on public.messages;
create trigger on_message_push after insert on public.messages for each row execute function public.chat_push();

-- 실시간 채널: 전체 대화방, 그리고 자기 앞으로 온 1:1 대화 채널만 들을 수 있음
drop policy if exists "chat_read" on realtime.messages;
create policy "chat_read" on realtime.messages for select to authenticated using (
  (select realtime.topic()) = 'chat:all' or (select realtime.topic()) = 'chat:u:' || auth.uid()::text);

-- ═══════════ 접속 현황 보강: 앱을 나가 있어도 오늘 공부 시간이 측정 중인 사람 ═══════════
-- 다른 사람의 공부 기록(progress)은 RLS로 못 읽으므로, 이름과 '측정 중' 여부만 돌려주는 함수를 둔다.
-- 앱과 같은 규칙: 오늘(한국시각) 기록의 마지막 구간이 끝나지 않았고, 마지막으로 앱을 본 시각(hb)이 3시간 이내. 관리자는 제외.
create or replace function public.study_now()
returns table (id uuid, name text, since bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, round((pr.data -> 'segs' -> -1 ->> 's')::numeric)::bigint
  from public.progress pr join public.profiles p on p.id = pr.user_id
  where auth.uid() is not null
    and p.role <> 'admin'
    and pr.pid = 't:' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD')
    and jsonb_typeof(pr.data -> 'segs') = 'array' and jsonb_array_length(pr.data -> 'segs') > 0
    and coalesce(pr.data -> 'segs' -> -1 ->> 'e', '') = ''
    and coalesce((pr.data ->> 'hb')::numeric, (pr.data -> 'segs' -> -1 ->> 's')::numeric) > extract(epoch from now()) * 1000 - 3 * 3600 * 1000;
$$;
revoke all on function public.study_now() from public, anon;
grant execute on function public.study_now() to authenticated;

-- ═══════════ 공부 시간 현황: 모든 사용자가 서로의 오늘 공부 시간을 본다(관리자 포함) ═══════════
-- 다른 사람의 progress는 RLS로 못 읽으므로 이름·역할과 오늘 공부 구간(segs)·마지막 확인 시각(hb)만 돌려준다. 로그인한 사용자만.
create or replace function public.study_today()
returns table (id uuid, name text, role text, data jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.role,
    case when pr.data is null then null else jsonb_build_object('segs', pr.data -> 'segs', 'hb', pr.data -> 'hb') end
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id and pr.pid = 't:' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD')
  where auth.uid() is not null;
$$;
revoke all on function public.study_today() from public, anon;
grant execute on function public.study_today() to authenticated;

-- ═══════════ 일시정지 잊음 알림 (웹 푸시) ═══════════
-- 공부 시간이 측정 중인데 1시간 넘게 앱을 열지 않으면(마지막 확인 hb 기준) 그 사람 기기로 "아직 공부 중이신가요?" 알림,
-- 2시간 30분이면 "30분 뒤 자동 일시정지" 알림을 한 번 더 보낸다(같은 hb에 단계마다 한 번씩만). 10분마다 pg_cron이 실행한다.
create table if not exists public.study_nudges (
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null, hb bigint not null, n int not null default 0, sent_at timestamptz not null default now(),
  primary key (user_id, day, hb)
);
alter table public.study_nudges enable row level security;   -- 정책 없음: 아래 함수만 사용
revoke all on public.study_nudges from anon, authenticated;
create or replace function public.study_nudge_run() returns int
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; r record; subs jsonb; stage int; sent int := 0; hhmm text;
  nowms numeric := extract(epoch from now()) * 1000; d text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
begin
  select v into cfg from push_config where k = 'vapid';
  if cfg is null then return 0; end if;
  delete from study_nudges where sent_at < now() - interval '3 days';
  for r in
    select pr.user_id, (pr.data ->> 'hb')::numeric as hb from progress pr
    where pr.pid = 't:' || d and jsonb_typeof(pr.data -> 'segs') = 'array' and jsonb_array_length(pr.data -> 'segs') > 0
      and coalesce(pr.data -> 'segs' -> -1 ->> 'e', '') = '' and (pr.data ->> 'hb') is not null
      and nowms - (pr.data ->> 'hb')::numeric between 3600000 and 10800000
  loop
    stage := case when nowms - r.hb >= 9000000 then 2 else 1 end;   -- 1시간 / 2시간 30분
    if exists (select 1 from study_nudges x where x.user_id = r.user_id and x.day = d and x.hb = round(r.hb) and x.n >= stage) then continue; end if;
    insert into study_nudges (user_id, day, hb, n) values (r.user_id, d, round(r.hb), stage)
      on conflict (user_id, day, hb) do update set n = excluded.n, sent_at = now();
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb) into subs
      from (select * from push_subs x where x.user_id = r.user_id and x.updated_at > now() - interval '60 days' order by x.updated_at desc limit 10) s;
    if jsonb_array_length(subs) = 0 then continue; end if;
    hhmm := to_char(to_timestamp(r.hb / 1000) at time zone 'Asia/Seoul', 'HH24:MI');
    perform net.http_post(url := cfg ->> 'relay', headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('vapid', cfg - 'relay', 'subs', subs, 'msg', jsonb_build_object(
        'kind', 'st', 'tag', 'st-' || d, 'id', round(r.hb),
        'title', case when stage = 2 then '모멘텀 · 30분 뒤 자동 일시정지돼요' else '모멘텀 · 아직 공부 중이신가요?' end,
        'body', hhmm || ' 이후로 앱을 열지 않았어요. 공부를 마쳤다면 눌러서 일시정지해 주세요' || case when stage = 2 then ' (그대로 두면 30분 뒤 자동 일시정지).' else '.' end)));
    sent := sent + 1;
  end loop;
  return sent;
exception when others then return -1;
end;
$$;
revoke all on function public.study_nudge_run() from public, anon, authenticated;
-- 10분마다 실행: Supabase의 pg_cron 확장 (오류가 나면 대시보드 Database → Extensions에서 pg_cron을 켠 뒤 아래 두 줄만 다시 실행)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.unschedule(jobid) from cron.job where jobname = 'momentum-study-nudge';
select cron.schedule('momentum-study-nudge', '*/10 * * * *', 'select public.study_nudge_run()');
