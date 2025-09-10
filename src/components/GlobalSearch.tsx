import { useState, useEffect } from "react";
import { Search, Users, FileText, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkers, useAttendance, usePayments } from "@/hooks/useWorkers";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  type: 'worker' | 'project' | 'attendance' | 'payment';
  title: string;
  subtitle?: string;
  action?: string;
  icon: React.ComponentType<any>;
}

interface GlobalSearchProps {
  onSectionChange: (section: string) => void;
}

export function GlobalSearch({ onSectionChange }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const { data: workers } = useWorkers();
  const { data: attendance } = useAttendance();
  const { data: payments } = usePayments();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowercaseQuery = query.toLowerCase();

    // Search workers
    workers?.forEach(worker => {
      if (worker.full_name.toLowerCase().includes(lowercaseQuery) ||
          worker.position?.toLowerCase().includes(lowercaseQuery) ||
          worker.phone?.includes(query)) {
        searchResults.push({
          id: worker.id,
          type: 'worker',
          title: worker.full_name,
          subtitle: worker.position || 'Работник',
          action: 'workers',
          icon: Users
        });
      }
    });

    // Search recent attendance (today and yesterday)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    attendance?.forEach(record => {
      const recordDate = new Date(record.date);
      const isRecent = recordDate >= yesterday;
      
      const worker = workers?.find(w => w.id === record.worker_id);
      if (isRecent && worker?.full_name.toLowerCase().includes(lowercaseQuery)) {
        searchResults.push({
          id: record.id,
          type: 'attendance',
          title: `${worker.full_name} - ${record.status === 'present' ? 'Присутствовал' : 'Отсутствовал'}`,
          subtitle: record.date,
          action: 'workers',
          icon: Calendar
        });
      }
    });

    // Limit results
    setResults(searchResults.slice(0, 8));
  }, [query, workers, attendance, payments]);

  const handleResultClick = (result: SearchResult) => {
    if (result.action) {
      onSectionChange(result.action);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Поиск работников, проектов..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-muted/50"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto shadow-lg">
          <CardContent className="p-0">
            {results.length === 0 && query.length >= 2 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Ничего не найдено по запросу "{query}"</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="p-2 bg-muted rounded-md">
                      <result.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.type === 'worker' && 'Работник'}
                      {result.type === 'attendance' && 'Посещение'}
                      {result.type === 'payment' && 'Платеж'}
                      {result.type === 'project' && 'Проект'}
                    </Badge>
                  </button>
                ))}
                
                {query.length >= 2 && results.length > 0 && (
                  <div className="px-4 py-2 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      Найдено {results.length} результат{results.length > 1 ? (results.length > 4 ? 'ов' : 'а') : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Background overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}