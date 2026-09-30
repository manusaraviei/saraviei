-- ============================================
-- ATELIÊ DO AXÉ
-- BANCO DE DADOS PRINCIPAL
-- ============================================


-- ============================================
-- 1. PERFIL DO USUÁRIO
-- ============================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    nome text not null,
    sobrenome text,
    cpf text,
    whatsapp text,

    avatar_url text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 2. ENDEREÇOS
-- ============================================

create table public.addresses (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references public.profiles(id) on delete cascade,

    apelido text not null default 'Minha casa',
    destinatario text not null,

    cep text not null,
    logradouro text not null,
    numero text not null,
    complemento text,
    bairro text not null,
    cidade text not null,
    estado text not null,
    referencia text,

    is_default boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 3. CLIENTE NO MERCADO PAGO
-- ============================================

create table public.payment_customers (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique references public.profiles(id) on delete cascade,

    mercadopago_customer_id text not null unique,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 4. CARTÕES SALVOS
-- ============================================

create table public.saved_cards (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references public.profiles(id) on delete cascade,

    mercadopago_customer_id text not null,
    mercadopago_card_id text not null unique,

    brand text,
    last_four text,

    expiration_month integer,
    expiration_year integer,

    is_default boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 5. COLEÇÕES
-- ============================================

create table public.collections (
    id uuid primary key default gen_random_uuid(),

    nome text not null,
    slug text not null unique,

    descricao text,

    cor_principal text,
    cor_secundaria text,

    imagem_hero text,

    ativa boolean not null default true,

    ordem integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 6. PRODUTOS
-- ============================================

create table public.products (
    id uuid primary key default gen_random_uuid(),

    collection_id uuid references public.collections(id) on delete set null,

    nome text not null,
    slug text not null unique,

    descricao text,

    preco numeric(10,2) not null check (preco >= 0),

    preco_promocional numeric(10,2),

    custo numeric(10,2),

    ativo boolean not null default true,
    destaque boolean not null default false,

    peso numeric(10,3),
    altura numeric(10,2),
    largura numeric(10,2),
    comprimento numeric(10,2),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint preco_promocional_valido
        check (
            preco_promocional is null
            or preco_promocional >= 0
            and preco_promocional < preco
        )
);


-- ============================================
-- 7. IMAGENS DOS PRODUTOS
-- ============================================

create table public.product_images (
    id uuid primary key default gen_random_uuid(),

    product_id uuid not null references public.products(id) on delete cascade,

    url text not null,
    alt_text text,

    ordem integer not null default 0,

    is_primary boolean not null default false,

    created_at timestamptz not null default now()
);


-- ============================================
-- 8. ESTOQUE
-- ============================================

create table public.inventory (
    product_id uuid primary key references public.products(id) on delete cascade,

    quantidade integer not null default 0 check (quantidade >= 0),

    quantidade_reservada integer not null default 0
        check (quantidade_reservada >= 0),

    estoque_minimo integer not null default 0
        check (estoque_minimo >= 0),

    updated_at timestamptz not null default now()
);


-- ============================================
-- 9. CARRINHOS
-- ============================================

create table public.carts (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique references public.profiles(id) on delete cascade,

    status text not null default 'active'
        check (status in ('active', 'converted', 'abandoned')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 10. ITENS DO CARRINHO
-- ============================================

create table public.cart_items (
    id uuid primary key default gen_random_uuid(),

    cart_id uuid not null references public.carts(id) on delete cascade,

    product_id uuid not null references public.products(id) on delete restrict,

    quantidade integer not null default 1
        check (quantidade > 0),

    created_at timestamptz not null default now(),

    unique(cart_id, product_id)
);


-- ============================================
-- 11. PEDIDOS
-- ============================================

create table public.orders (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references public.profiles(id) on delete restrict,

    numero_pedido bigint generated always as identity unique,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'confirmed',
                'processing',
                'shipped',
                'delivered',
                'cancelled'
            )
        ),

    payment_status text not null default 'pending'
        check (
            payment_status in (
                'pending',
                'approved',
                'rejected',
                'cancelled',
                'refunded'
            )
        ),

    shipping_status text not null default 'pending'
        check (
            shipping_status in (
                'pending',
                'processing',
                'shipped',
                'delivered',
                'cancelled'
            )
        ),

    subtotal numeric(10,2) not null default 0,
    discount numeric(10,2) not null default 0,
    shipping_cost numeric(10,2) not null default 0,
    total numeric(10,2) not null default 0,

    shipping_address jsonb,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 12. ITENS DO PEDIDO
-- ============================================

create table public.order_items (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null references public.orders(id) on delete cascade,

    product_id uuid references public.products(id) on delete set null,

    product_name text not null,

    quantidade integer not null
        check (quantidade > 0),

    unit_price numeric(10,2) not null
        check (unit_price >= 0),

    discount numeric(10,2) not null default 0
        check (discount >= 0),

    total numeric(10,2) not null
        check (total >= 0),

    created_at timestamptz not null default now()
);


-- ============================================
-- 13. PAGAMENTOS
-- ============================================

create table public.payments (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null references public.orders(id) on delete cascade,

    provider text not null default 'mercado_pago',

    mercadopago_payment_id text unique,

    method text not null
        check (
            method in (
                'pix',
                'credit_card',
                'debit_card'
            )
        ),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'approved',
                'rejected',
                'cancelled',
                'refunded'
            )
        ),

    amount numeric(10,2) not null
        check (amount >= 0),

    installments integer not null default 1
        check (installments > 0),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 14. ENTREGAS
-- ============================================

create table public.shipments (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null unique references public.orders(id) on delete cascade,

    carrier text,
    service text,

    tracking_code text,

    shipping_cost numeric(10,2) not null default 0,

    estimated_days integer,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'processing',
                'shipped',
                'delivered',
                'cancelled'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================
-- 15. ADMINISTRADORES
-- ============================================

create table public.admin_users (
    user_id uuid primary key references public.profiles(id) on delete cascade,

    role text not null default 'admin'
        check (
            role in (
                'admin',
                'manager',
                'support'
            )
        ),

    active boolean not null default true,

    created_at timestamptz not null default now()
);


-- ============================================
-- ÍNDICES
-- ============================================

create index idx_addresses_user_id
    on public.addresses(user_id);

create index idx_saved_cards_user_id
    on public.saved_cards(user_id);

create index idx_products_collection_id
    on public.products(collection_id);

create index idx_products_ativo
    on public.products(ativo);

create index idx_product_images_product_id
    on public.product_images(product_id);

create index idx_cart_items_cart_id
    on public.cart_items(cart_id);

create index idx_orders_user_id
    on public.orders(user_id);

create index idx_orders_status
    on public.orders(status);

create index idx_orders_payment_status
    on public.orders(payment_status);

create index idx_order_items_order_id
    on public.order_items(order_id);

create index idx_payments_order_id
    on public.payments(order_id);

create index idx_shipments_order_id
    on public.shipments(order_id);


-- ============================================
-- RLS
-- ============================================

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.payment_customers enable row level security;
alter table public.saved_cards enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.admin_users enable row level security;


-- ============================================
-- POLÍTICAS DO CLIENTE
-- ============================================

create policy "Usuário pode ver seu perfil"
on public.profiles
for select
using (auth.uid() = id);


create policy "Usuário pode atualizar seu perfil"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);


create policy "Usuário pode ver seus endereços"
on public.addresses
for select
using (auth.uid() = user_id);


create policy "Usuário pode criar seus endereços"
on public.addresses
for insert
with check (auth.uid() = user_id);


create policy "Usuário pode atualizar seus endereços"
on public.addresses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


create policy "Usuário pode excluir seus endereços"
on public.addresses
for delete
using (auth.uid() = user_id);


create policy "Usuário pode ver seus cartões"
on public.saved_cards
for select
using (auth.uid() = user_id);


create policy "Usuário pode ver seu carrinho"
on public.carts
for select
using (auth.uid() = user_id);


create policy "Usuário pode criar seu carrinho"
on public.carts
for insert
with check (auth.uid() = user_id);


create policy "Usuário pode atualizar seu carrinho"
on public.carts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


create policy "Usuário pode ver itens do seu carrinho"
on public.cart_items
for select
using (
    exists (
        select 1
        from public.carts
        where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
);


create policy "Usuário pode adicionar itens ao seu carrinho"
on public.cart_items
for insert
with check (
    exists (
        select 1
        from public.carts
        where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
);


create policy "Usuário pode atualizar itens do seu carrinho"
on public.cart_items
for update
using (
    exists (
        select 1
        from public.carts
        where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.carts
        where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
);


create policy "Usuário pode excluir itens do seu carrinho"
on public.cart_items
for delete
using (
    exists (
        select 1
        from public.carts
        where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
);


create policy "Usuário pode ver seus pedidos"
on public.orders
for select
using (auth.uid() = user_id);


create policy "Usuário pode ver itens dos seus pedidos"
on public.order_items
for select
using (
    exists (
        select 1
        from public.orders
        where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
);


create policy "Usuário pode ver pagamentos dos seus pedidos"
on public.payments
for select
using (
    exists (
        select 1
        from public.orders
        where orders.id = payments.order_id
        and orders.user_id = auth.uid()
    )
);


create policy "Usuário pode ver entregas dos seus pedidos"
on public.shipments
for select
using (
    exists (
        select 1
        from public.orders
        where orders.id = shipments.order_id
        and orders.user_id = auth.uid()
    )
);


-- ============================================
-- CATÁLOGO PÚBLICO
-- ============================================

create policy "Coleções ativas são públicas"
on public.collections
for select
using (ativa = true);


create policy "Produtos ativos são públicos"
on public.products
for select
using (ativo = true);


create policy "Imagens de produtos ativos são públicas"
on public.product_images
for select
using (
    exists (
        select 1
        from public.products
        where products.id = product_images.product_id
        and products.ativo = true
    )
);


-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at();


create trigger addresses_updated_at
before update on public.addresses
for each row
execute function public.update_updated_at();


create trigger payment_customers_updated_at
before update on public.payment_customers
for each row
execute function public.update_updated_at();


create trigger saved_cards_updated_at
before update on public.saved_cards
for each row
execute function public.update_updated_at();


create trigger collections_updated_at
before update on public.collections
for each row
execute function public.update_updated_at();


create trigger products_updated_at
before update on public.products
for each row
execute function public.update_updated_at();


create trigger inventory_updated_at
before update on public.inventory
for each row
execute function public.update_updated_at();


create trigger carts_updated_at
before update on public.carts
for each row
execute function public.update_updated_at();


create trigger orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at();


create trigger payments_updated_at
before update on public.payments
for each row
execute function public.update_updated_at();


create trigger shipments_updated_at
before update on public.shipments
for each row
execute function public.update_updated_at();


-- ============================================
-- FIM
-- ============================================