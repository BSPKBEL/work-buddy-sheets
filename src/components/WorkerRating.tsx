import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWorkers, useAttendance, usePayments } from "@/hooks/useWorkers";
import { Star, TrendingUp, Calendar, Award, Users } from "lucide-react";

interface WorkerRatingData {
  id: string;
  name: string;
  overallRating: number;
  attendanceRate: number;
  workDays: number;
  totalEarned: number;
  totalPaid: number;
  reliability: number;
  performance: number;
  badge: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

const calculateWorkerRating = (
  worker: any,
  attendance: any[],
  payments: any[]
): WorkerRatingData => {
  // Filter attendance and payments for this worker
  const workerAttendance = attendance?.filter(a => a.worker_id === worker.id) || [];
  const workerPayments = payments?.filter(p => p.worker_id === worker.id) || [];

  // Calculate basic metrics
  const workDays = workerAttendance.filter(a => a.status === 'present').length;
  const totalDays = workerAttendance.length;
  const attendanceRate = totalDays > 0 ? (workDays / totalDays) * 100 : 0;

  // Calculate financial metrics
  const totalEarned = workDays * worker.daily_rate;
  const totalPaid = workerPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate reliability (consistency of attendance)
  const reliability = Math.min(attendanceRate, 100);

  // Calculate performance (based on work consistency and financial discipline)
  const paymentRatio = totalEarned > 0 ? (totalPaid / totalEarned) * 100 : 0;
  const performance = (reliability * 0.7) + (Math.min(paymentRatio, 100) * 0.3);

  // Calculate overall rating (0-100)
  const overallRating = (reliability * 0.6) + (performance * 0.4);

  // Determine badge level
  let badge: 'excellent' | 'good' | 'average' | 'needs_improvement';
  if (overallRating >= 90) badge = 'excellent';
  else if (overallRating >= 75) badge = 'good';
  else if (overallRating >= 60) badge = 'average';
  else badge = 'needs_improvement';

  return {
    id: worker.id,
    name: worker.full_name,
    overallRating,
    attendanceRate,
    workDays,
    totalEarned,
    totalPaid,
    reliability,
    performance,
    badge
  };
};

const getBadgeConfig = (badge: string) => {
  switch (badge) {
    case 'excellent':
      return { label: 'Отличный', variant: 'default' as const, icon: Award };
    case 'good':
      return { label: 'Хороший', variant: 'secondary' as const, icon: TrendingUp };
    case 'average':
      return { label: 'Средний', variant: 'outline' as const, icon: Users };
    case 'needs_improvement':
      return { label: 'Требует внимания', variant: 'destructive' as const, icon: Calendar };
    default:
      return { label: 'Нет данных', variant: 'outline' as const, icon: Users };
  }
};

export function WorkerRating() {
  const { data: workers } = useWorkers();
  const { data: attendance } = useAttendance();
  const { data: payments } = usePayments();

  const workerRatings = useMemo(() => {
    if (!workers || !attendance || !payments) return [];

    return workers
      .map(worker => calculateWorkerRating(worker, attendance, payments))
      .sort((a, b) => b.overallRating - a.overallRating);
  }, [workers, attendance, payments]);

  if (!workers || workers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Рейтинг работников
          </CardTitle>
          <CardDescription>
            Система оценки эффективности работников на основе посещаемости и показателей
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Нет данных о работниках для расчета рейтинга
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {workerRatings.filter(w => w.badge === 'excellent').length}
                </p>
                <p className="text-xs text-muted-foreground">Отличных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {workerRatings.filter(w => w.badge === 'good').length}
                </p>
                <p className="text-xs text-muted-foreground">Хороших</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {workerRatings.filter(w => w.badge === 'average').length}
                </p>
                <p className="text-xs text-muted-foreground">Средних</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">
                  {workerRatings.filter(w => w.badge === 'needs_improvement').length}
                </p>
                <p className="text-xs text-muted-foreground">Требуют внимания</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ratings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Рейтинг работников
          </CardTitle>
          <CardDescription>
            Система оценки на основе посещаемости, надежности и финансовой дисциплины
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workerRatings.map((rating, index) => {
              const badgeConfig = getBadgeConfig(rating.badge);
              const IconComponent = badgeConfig.icon;
              
              return (
                <div key={rating.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{rating.name}</h3>
                        <Badge variant={badgeConfig.variant} className="text-xs flex items-center gap-1">
                          <IconComponent className="h-3 w-3" />
                          {badgeConfig.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{rating.workDays} дней работы</span>
                        <span>{rating.attendanceRate.toFixed(1)}% посещаемость</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {rating.overallRating.toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">баллов</p>
                    </div>
                    
                    <div className="w-24">
                      <Progress 
                        value={rating.overallRating} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}