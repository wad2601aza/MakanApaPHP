-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.balance_history (
  id integer NOT NULL DEFAULT nextval('balance_history_id_seq'::regclass),
  user_id integer,
  type character varying,
  amount integer,
  reference_id integer,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT balance_history_pkey PRIMARY KEY (id),
  CONSTRAINT balance_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.offers (
  id integer NOT NULL DEFAULT nextval('offers_id_seq'::regclass),
  request_id integer,
  seller_name character varying,
  food_name character varying,
  price integer,
  contact character varying,
  stock integer DEFAULT 1,
  media_url text,
  weight_volume integer,
  unit character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offers_pkey PRIMARY KEY (id),
  CONSTRAINT offers_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id)
);
CREATE TABLE public.orders (
  id integer NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  user_id bigint,
  request_id integer,
  buyer_name character varying,
  buyer_address text,
  seller_name character varying,
  food_name character varying,
  price integer,
  quantity integer,
  total integer,
  contact character varying,
  created_at timestamp with time zone DEFAULT now(),
  buyer_phone character varying,
  seller_phone character varying,
  status character varying DEFAULT 'pending'::character varying,
  notes text,
  location_coords character varying,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.requests (
  id integer NOT NULL DEFAULT nextval('requests_id_seq'::regclass),
  user_id integer,
  buyer_name character varying,
  description text,
  quantity integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT requests_pkey PRIMARY KEY (id),
  CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  auth_id uuid,
  phone character varying UNIQUE,
  name character varying,
  balance integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);