import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Bot, User, AlertTriangle } from 'lucide-react';
import { useAIContext } from '@/hooks/useAIContext';
import { AIPermissionGuard } from './AIPermissionGuard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  filtered?: boolean;
  filterReason?: string;
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { aiContext, getSystemPrompt, filterPrompt, canAccessAIFeature } = useAIContext();
  const { toast } = useToast();

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
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Filter and validate the prompt
      const { allowed, filteredPrompt, reason } = filterPrompt(input);
      
      if (!allowed) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: reason || 'Запрос был отклонен системой безопасности',
          sender: 'ai',
          timestamp: new Date(),
          filtered: true,
          filterReason: reason
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      // Call AI chat edge function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          prompt: filteredPrompt,
          systemPrompt: getSystemPrompt('general_chat'),
          context: {
            role: aiContext.maxComplexity,
            allowedDataTypes: aiContext.allowedDataTypes,
            canAccessFinancials: aiContext.canAccessFinancials
          }
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: data.response || 'Извините, не удалось получить ответ от AI.',
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('AI Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: 'Произошла ошибка при обращении к AI. Попробуйте позже.',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Ошибка AI чата",
        description: "Не удалось получить ответ от AI помощника",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              {aiContext.maxComplexity === 'advanced' ? 'Админ' : 
               aiContext.maxComplexity === 'intermediate' ? 'Прораб' : 'Рабочий'}
            </Badge>
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
                  <p>Привет! Я AI помощник.</p>
                  <p className="text-xs mt-1">
                    Доступ к данным: {aiContext.allowedDataTypes.join(', ')}
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
                        {message.content}
                      </div>
                      
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
          
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Сложность: {aiContext.maxComplexity} • 
            Доступно функций: {Object.keys(aiContext.allowedDataTypes).length}
          </div>
        </CardContent>
      </Card>
    </AIPermissionGuard>
  );
}