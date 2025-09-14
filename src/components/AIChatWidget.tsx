import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Bot, User, AlertTriangle, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useAIContext } from '@/hooks/useAIContext';
import { AIPermissionGuard } from './AIPermissionGuard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useSecureAuth } from '@/hooks/useSecureAuth';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  filtered?: boolean;
  filterReason?: string;
  truncated?: boolean;
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { aiContext, getSystemPrompt, filterPrompt, canAccessAIFeature } = useAIContext();
  const { toast } = useToast();
  const currentUser = useSecureAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          prompt: userMessage.content,
          systemPrompt: `Ты - AI ассистент для системы управления строительными проектами.
          
          Отвечай ТОЛЬКО на русском языке.
          Будь кратким и конкретным.
          НЕ показывай свои рассуждения.
          
          У тебя есть доступ к данным:
          - Проекты: список, статус, бюджет, команда
          - Работники: ФИО, должности, навыки, статус
          - Финансы: зарплаты, расходы, отчеты
          - Аналитика: производительность, метрики
          
          Отвечай только фактами из данных проекта.`,
          context: {
            role: currentUser?.primaryRole || 'guest',
            allowedDataTypes: ['projects', 'workers', 'finances', 'analytics'],
            canAccessFinancials: currentUser?.isAdmin || currentUser?.isForeman,
          }
        }
      });

      if (error) throw error;

      const response = data?.response || 'Не удалось получить ответ от AI.';
      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: response,
        sender: 'ai',
        timestamp: new Date(),
        truncated: response.length > 300
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('AI Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: `Ошибка: ${error.message || 'Не удалось отправить сообщение'}`,
        sender: 'ai',
        timestamp: new Date(),
        filtered: true,
        filterReason: 'Системная ошибка'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Ошибка AI чата",
        description: error.message || "Не удалось получить ответ от AI помощника",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const newDialog = () => {
    setMessages([]);
    setExpandedMessages(new Set());
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <AIPermissionGuard requiredFeature="chat" showWarning={false}>
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </AIPermissionGuard>
    );
  }

  return (
    <AIPermissionGuard requiredFeature="chat">
      <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl border-2 flex flex-col z-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-primary/5">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Помощник</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {currentUser?.isAdmin ? 'Админ' : 
               currentUser?.isForeman ? 'Прораб' : 'Рабочий'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={newDialog}
              className="h-6 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Новый
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Привет! Я AI помощник по строительным проектам.</p>
                  <p className="text-xs mt-1">
                    Попробуйте: "дай список работников" или "отчет по проекту [название]"
                  </p>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.filtered
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-1 mb-1">
                        {message.sender === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : message.filtered ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      
                      <div className="text-sm whitespace-pre-wrap">
                        {message.truncated && !expandedMessages.has(message.id) 
                          ? `${message.content.substring(0, 300)}...`
                          : message.content
                        }
                      </div>
                      
                      {message.truncated && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => toggleMessageExpansion(message.id)}
                          className="h-auto p-0 text-xs mt-1 hover:no-underline"
                        >
                          {expandedMessages.has(message.id) ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Свернуть
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Показать полностью
                            </>
                          )}
                        </Button>
                      )}
                      
                      {message.filtered && message.filterReason && (
                        <div className="text-xs mt-1 opacity-75">
                          Причина: {message.filterReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-3 w-3" />
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-100" />
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
          
          <div className="flex space-x-2 mt-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Задайте вопрос AI помощнику..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-muted-foreground">
              Сложность: {aiContext.maxComplexity} • 
              Доступно функций: {Object.keys(aiContext.allowedDataTypes).length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke('ai-chat', {
                    body: {
                      prompt: 'Привет! Проверь работу ИИ',
                      systemPrompt: getSystemPrompt('test'),
                      context: { test: true }
                    }
                  });
                  if (error) throw error;
                  toast({
                    title: "Тест ИИ",
                    description: "ИИ работает нормально!",
                  });
                } catch (error) {
                  toast({
                    title: "Ошибка ИИ",
                    description: "ИИ не настроен или недоступен",
                    variant: "destructive",
                  });
                }
              }}
              className="text-xs h-6"
            >
              ТЕСТ
            </Button>
          </div>
        </CardContent>
      </Card>
    </AIPermissionGuard>
  );
}