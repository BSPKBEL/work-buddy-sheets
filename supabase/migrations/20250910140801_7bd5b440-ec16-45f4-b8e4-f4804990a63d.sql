-- Создание таблиц для Этапа 2: CRM, расходы, компетенции

-- Таблица клиентов
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  company_type TEXT DEFAULT 'individual',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Обновление таблицы проектов для связи с клиентами
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Категории расходов
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general', -- 'worker', 'project', 'general'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Расходы по проектам
CREATE TABLE public.project_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Расходы на работников
CREATE TABLE public.worker_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Навыки
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'technical',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Навыки работников
CREATE TABLE public.worker_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  years_experience INTEGER DEFAULT 0,
  certified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(worker_id, skill_id)
);

-- Сертификаты
CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_organization TEXT,
  issue_date DATE,
  expiration_date DATE,
  certificate_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Задачи проектов
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_worker_id UUID REFERENCES public.workers(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'completed', 'cancelled'
  priority TEXT NOT NULL DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включение RLS для всех новых таблиц
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Политики RLS: Только админы могут управлять всеми данными
CREATE POLICY "Admin full access to clients" ON public.clients FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to project_expenses" ON public.project_expenses FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to worker_expenses" ON public.worker_expenses FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to skills" ON public.skills FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to worker_skills" ON public.worker_skills FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to certifications" ON public.certifications FOR ALL TO authenticated USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin full access to project_tasks" ON public.project_tasks FOR ALL TO authenticated USING (get_current_user_role() = 'admin');

-- Триггеры для обновления updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_expenses_updated_at BEFORE UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_worker_expenses_updated_at BEFORE UPDATE ON public.worker_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_worker_skills_updated_at BEFORE UPDATE ON public.worker_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Вставка базовых категорий расходов
INSERT INTO public.expense_categories (name, description, type) VALUES 
('Зарплата', 'Заработная плата работников', 'worker'),
('Обучение', 'Курсы и сертификация работников', 'worker'),
('Экипировка', 'Рабочая одежда и инструменты', 'worker'),
('Материалы', 'Строительные материалы для проекта', 'project'),
('Оборудование', 'Аренда и закупка оборудования', 'project'),
('Транспорт', 'Транспортные расходы', 'project'),
('Аренда', 'Аренда помещений и офисов', 'general'),
('Коммунальные услуги', 'Электричество, вода, интернет', 'general'),
('Маркетинг', 'Реклама и продвижение', 'general'),
('Административные', 'Канцелярия, связь, бухгалтерия', 'general');

-- Вставка базовых навыков
INSERT INTO public.skills (name, category, description) VALUES 
('Кирпичная кладка', 'строительство', 'Навыки работы с кирпичом и строительным раствором'),
('Бетонные работы', 'строительство', 'Заливка и работа с бетоном'),
('Электромонтаж', 'электрика', 'Прокладка электрических сетей'),
('Сантехника', 'инженерия', 'Монтаж водопроводных и канализационных систем'),
('Отделочные работы', 'отделка', 'Штукатурка, покраска, обои'),
('Кровельные работы', 'строительство', 'Монтаж и ремонт крыш'),
('Управление проектами', 'менеджмент', 'Планирование и координация работ'),
('Работа на высоте', 'безопасность', 'Альпинистские и высотные работы'),
('Сварочные работы', 'металлообработка', 'Различные виды сварки'),
('Геодезия', 'техническое', 'Измерительные и разметочные работы');