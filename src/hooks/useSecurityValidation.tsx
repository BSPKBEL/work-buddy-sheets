import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSecureAuth } from "./useSecureAuth";

interface SecurityValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface InputValidationResult {
  isValid: boolean;
  message?: string;
}

export function useSecurityValidation() {
  const { user, isAuthenticated } = useSecureAuth();
  const [systemSecurity, setSystemSecurity] = useState<SecurityValidation>({
    isValid: true,
    errors: [],
    warnings: []
  });

  useEffect(() => {
    if (isAuthenticated) {
      validateSystemSecurity();
    }
  }, [isAuthenticated]);

  const validateSystemSecurity = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if user has 2FA enabled (for admins)
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .eq('is_active', true);

      if (userRoles && userRoles.length > 0) {
        const { data: user2FA } = await supabase
          .from('user_2fa')
          .select('is_enabled')
          .eq('user_id', user?.id)
          .eq('is_enabled', true)
          .maybeSingle();

        if (!user2FA) {
          warnings.push('Рекомендуется включить двухфакторную аутентификацию для администраторов');
        }
      }

      // Check for expired temporary permissions
      const { data: expiredPerms } = await supabase
        .from('temporary_permissions')
        .select('id')
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString());

      if (expiredPerms && expiredPerms.length > 0) {
        warnings.push(`${expiredPerms.length} временных разрешений истекли`);
      }

    } catch (error) {
      console.error('Security validation error:', error);
      errors.push('Ошибка проверки безопасности системы');
    }

    setSystemSecurity({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  };

  // Input validation functions
  const validateEmail = (email: string): InputValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Некорректный формат email' };
    }
    return { isValid: true };
  };

  const validatePassword = (password: string): InputValidationResult => {
    if (password.length < 8) {
      return { isValid: false, message: 'Пароль должен содержать минимум 8 символов' };
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, message: 'Пароль должен содержать строчные буквы' };
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, message: 'Пароль должен содержать заглавные буквы' };
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Пароль должен содержать цифры' };
    }

    // Check for common weak patterns
    const commonPatterns = ['123456', 'password', 'qwerty', 'admin'];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      return { isValid: false, message: 'Пароль содержит небезопасные комбинации' };
    }
    
    return { isValid: true };
  };

  const validatePhone = (phone: string): InputValidationResult => {
    const phoneRegex = /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return { isValid: false, message: 'Некорректный формат номера телефона' };
    }
    return { isValid: true };
  };

  const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous characters for XSS prevention
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const validateSQLInput = (input: string): InputValidationResult => {
    // Basic SQL injection prevention
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /('|('')|;|--|\/\*|\*\/)/g,
      /(xp_|sp_|fn_)/gi
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        return { isValid: false, message: 'Ввод содержит потенциально опасные символы' };
      }
    }
    
    return { isValid: true };
  };

  const validateFileUpload = (file: File): InputValidationResult => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.size > maxSize) {
      return { isValid: false, message: 'Файл слишком большой (максимум 10MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: 'Недопустимый тип файла' };
    }

    // Check file extension matches MIME type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeTypeMap: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/pdf': ['pdf'],
      'text/csv': ['csv'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx']
    };

    const expectedExtensions = mimeTypeMap[file.type] || [];
    if (!extension || !expectedExtensions.includes(extension)) {
      return { isValid: false, message: 'Расширение файла не соответствует типу' };
    }

    return { isValid: true };
  };

  const checkPermission = async (action: string, resource?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_user_access', {
        _user_id: user?.id,
        _required_role: 'admin', // This would be dynamic based on action
        _project_id: null // This would be set for project-specific permissions
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  };

  return {
    systemSecurity,
    validateSystemSecurity,
    
    // Input validation
    validateEmail,
    validatePassword,
    validatePhone,
    validateSQLInput,
    validateFileUpload,
    sanitizeInput,
    
    // Permission checking
    checkPermission,
  };
}