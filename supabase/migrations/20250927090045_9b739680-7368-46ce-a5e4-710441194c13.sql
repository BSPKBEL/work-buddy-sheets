-- Создание безопасных функций для операций ИИ с проверкой ролей

-- Функция для создания работника (только администратор)
CREATE OR REPLACE FUNCTION public.ai_create_worker(
  _full_name text,
  _position text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _daily_rate integer DEFAULT 0,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_worker_id uuid;
  result jsonb;
BEGIN
  -- Проверка прав доступа
  IF NOT has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для создания работника'
    );
  END IF;

  -- Создание работника
  INSERT INTO public.workers (full_name, position, phone, daily_rate, notes)
  VALUES (_full_name, _position, _phone, _daily_rate, _notes)
  RETURNING id INTO new_worker_id;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_CREATE_WORKER',
    'workers',
    new_worker_id,
    NULL,
    jsonb_build_object(
      'created_worker_id', new_worker_id,
      'full_name', _full_name,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'worker_id', new_worker_id,
    'message', 'Работник успешно создан'
  );
END;
$$;

-- Функция для обновления работника
CREATE OR REPLACE FUNCTION public.ai_update_worker(
  _worker_id uuid,
  _full_name text DEFAULT NULL,
  _position text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _daily_rate integer DEFAULT NULL,
  _status text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data jsonb;
  updated_count integer;
BEGIN
  -- Проверка прав доступа
  IF NOT has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для обновления работника'
    );
  END IF;

  -- Получение старых данных для логирования
  SELECT to_jsonb(w.*) INTO old_data FROM public.workers w WHERE id = _worker_id;
  
  IF old_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Работник не найден'
    );
  END IF;

  -- Обновление работника
  UPDATE public.workers 
  SET 
    full_name = COALESCE(_full_name, full_name),
    position = COALESCE(_position, position),
    phone = COALESCE(_phone, phone),
    daily_rate = COALESCE(_daily_rate, daily_rate),
    status = COALESCE(_status, status),
    notes = COALESCE(_notes, notes),
    updated_at = now()
  WHERE id = _worker_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_UPDATE_WORKER',
    'workers',
    _worker_id,
    old_data,
    jsonb_build_object(
      'updated_worker_id', _worker_id,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Работник успешно обновлен'
  );
END;
$$;

-- Функция для записи посещаемости
CREATE OR REPLACE FUNCTION public.ai_record_attendance(
  _worker_id uuid,
  _date date,
  _status text,
  _hours_worked integer DEFAULT 8,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendance_id uuid;
  can_access boolean := false;
BEGIN
  -- Проверка прав доступа
  IF has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    can_access := true;
  ELSIF has_role_enhanced(auth.uid(), 'foreman'::app_role) THEN
    -- Прораб может отмечать посещаемость для своих работников
    SELECT EXISTS(
      SELECT 1 FROM public.worker_assignments wa
      JOIN public.workers w ON wa.foreman_id = w.id
      JOIN public.profiles p ON w.id = p.id
      WHERE wa.worker_id = _worker_id 
      AND p.user_id = auth.uid()
    ) INTO can_access;
  END IF;

  IF NOT can_access THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для записи посещаемости'
    );
  END IF;

  -- Проверка существования записи на эту дату
  IF EXISTS(SELECT 1 FROM public.attendance WHERE worker_id = _worker_id AND date = _date) THEN
    -- Обновление существующей записи
    UPDATE public.attendance 
    SET 
      status = _status,
      hours_worked = _hours_worked,
      notes = _notes
    WHERE worker_id = _worker_id AND date = _date
    RETURNING id INTO attendance_id;
  ELSE
    -- Создание новой записи
    INSERT INTO public.attendance (worker_id, date, status, hours_worked, notes)
    VALUES (_worker_id, _date, _status, _hours_worked, _notes)
    RETURNING id INTO attendance_id;
  END IF;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_RECORD_ATTENDANCE',
    'attendance',
    attendance_id,
    NULL,
    jsonb_build_object(
      'worker_id', _worker_id,
      'date', _date,
      'status', _status,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Посещаемость успешно записана'
  );
END;
$$;

-- Функция для назначения работника на проект
CREATE OR REPLACE FUNCTION public.ai_assign_worker_to_project(
  _worker_id uuid,
  _project_id uuid,
  _foreman_id uuid DEFAULT NULL,
  _role text DEFAULT 'worker',
  _start_date date DEFAULT CURRENT_DATE,
  _end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_id uuid;
BEGIN
  -- Проверка прав доступа (только администратор или прораб)
  IF NOT (has_role_enhanced(auth.uid(), 'admin'::app_role) OR 
          has_role_enhanced(auth.uid(), 'foreman'::app_role)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для назначения работников'
    );
  END IF;

  -- Проверка существования назначения
  IF EXISTS(
    SELECT 1 FROM public.worker_assignments 
    WHERE worker_id = _worker_id 
    AND project_id = _project_id 
    AND (end_date IS NULL OR end_date > CURRENT_DATE)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Работник уже назначен на этот проект'
    );
  END IF;

  -- Создание назначения
  INSERT INTO public.worker_assignments (worker_id, project_id, foreman_id, role, start_date, end_date)
  VALUES (_worker_id, _project_id, _foreman_id, _role, _start_date, _end_date)
  RETURNING id INTO assignment_id;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_ASSIGN_WORKER',
    'worker_assignments',
    assignment_id,
    NULL,
    jsonb_build_object(
      'worker_id', _worker_id,
      'project_id', _project_id,
      'role', _role,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Работник успешно назначен на проект'
  );
END;
$$;

-- Функция для создания проекта
CREATE OR REPLACE FUNCTION public.ai_create_project(
  _name text,
  _description text DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _address text DEFAULT NULL,
  _budget numeric DEFAULT NULL,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _priority text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id uuid;
BEGIN
  -- Проверка прав доступа (только администратор)
  IF NOT has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для создания проекта'
    );
  END IF;

  -- Создание проекта
  INSERT INTO public.projects (name, description, client_id, address, budget, start_date, end_date, priority)
  VALUES (_name, _description, _client_id, _address, _budget, _start_date, _end_date, _priority)
  RETURNING id INTO new_project_id;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_CREATE_PROJECT',
    'projects',
    new_project_id,
    NULL,
    jsonb_build_object(
      'created_project_id', new_project_id,
      'name', _name,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'project_id', new_project_id,
    'message', 'Проект успешно создан'
  );
END;
$$;

-- Функция для создания платежа
CREATE OR REPLACE FUNCTION public.ai_create_payment(
  _worker_id uuid,
  _amount integer,
  _date date,
  _description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id uuid;
BEGIN
  -- Проверка прав доступа (только администратор)
  IF NOT has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для создания платежа'
    );
  END IF;

  -- Создание платежа
  INSERT INTO public.payments (worker_id, amount, date, description)
  VALUES (_worker_id, _amount, _date, _description)
  RETURNING id INTO payment_id;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_CREATE_PAYMENT',
    'payments',
    payment_id,
    NULL,
    jsonb_build_object(
      'worker_id', _worker_id,
      'amount', _amount,
      'date', _date,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'message', 'Платеж успешно создан'
  );
END;
$$;

-- Функция для создания задачи проекта
CREATE OR REPLACE FUNCTION public.ai_create_task(
  _project_id uuid,
  _title text,
  _description text DEFAULT NULL,
  _assigned_worker_id uuid DEFAULT NULL,
  _due_date date DEFAULT NULL,
  _priority text DEFAULT 'medium',
  _estimated_hours integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_id uuid;
BEGIN
  -- Проверка прав доступа (администратор или прораб)
  IF NOT (has_role_enhanced(auth.uid(), 'admin'::app_role) OR 
          has_role_enhanced(auth.uid(), 'foreman'::app_role)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно прав для создания задачи'
    );
  END IF;

  -- Создание задачи
  INSERT INTO public.project_tasks (
    project_id, title, description, assigned_worker_id, 
    due_date, priority, estimated_hours
  )
  VALUES (
    _project_id, _title, _description, _assigned_worker_id,
    _due_date, _priority, _estimated_hours
  )
  RETURNING id INTO task_id;

  -- Логирование операции
  PERFORM public.log_user_action(
    'AI_CREATE_TASK',
    'project_tasks',
    task_id,
    NULL,
    jsonb_build_object(
      'project_id', _project_id,
      'title', _title,
      'ai_operation', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'task_id', task_id,
    'message', 'Задача успешно создана'
  );
END;
$$;