-- Удаляем слишком открытые политики
DROP POLICY "Allow all operations" ON public.workers;
DROP POLICY "Allow all operations" ON public.attendance;
DROP POLICY "Allow all operations" ON public.payments;

-- Создаем более безопасные политики (пока открытые только для authenticated пользователей)
CREATE POLICY "Authenticated users can view workers" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert workers" ON public.workers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update workers" ON public.workers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete workers" ON public.workers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete attendance" ON public.attendance FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payments" ON public.payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete payments" ON public.payments FOR DELETE TO authenticated USING (true);