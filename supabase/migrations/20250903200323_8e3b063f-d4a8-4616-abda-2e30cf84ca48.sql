-- Создаем таблицу работников
CREATE TABLE public.workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  daily_rate INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу присутствия/работы
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'sick', 'vacation')),
  hours_worked INTEGER DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(worker_id, date)
);

-- Создаем таблицу выплат
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  amount INTEGER NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для всех таблиц
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Создаем политики (пока все открыто для разработки)
CREATE POLICY "Allow all operations" ON public.workers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.attendance FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.payments FOR ALL USING (true);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Триггер для workers
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Добавляем тестовых работников
INSERT INTO public.workers (full_name, phone, daily_rate) VALUES
('Иванов Петр Сергеевич', '+7900123456', 2500),
('Сидоров Алексей Владимирович', '+7900123457', 3000),
('Петров Михаил Иванович', '+7900123458', 2800),
('Козлов Дмитрий Андреевич', '+7900123459', 2700);