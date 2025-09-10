import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, Users, FileText, TrendingUp, Bot, Settings, Building } from "lucide-react";

interface BreadcrumbItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<any>;
}

const sectionConfig: Record<string, { title: string; icon: React.ComponentType<any>; parent?: string }> = {
  dashboard: { title: "Панель управления", icon: Home },
  workers: { title: "Работники", icon: Users },
  "workers-rating": { title: "Рейтинг", icon: Users, parent: "workers" },
  "add-worker": { title: "Добавить работника", icon: Users, parent: "workers" },
  projects: { title: "Проекты", icon: Building },
  expenses: { title: "Расходы", icon: Building, parent: "projects" },
  reports: { title: "Отчеты", icon: FileText },
  analytics: { title: "Аналитика", icon: TrendingUp },
  telegram: { title: "Telegram бот", icon: Bot, parent: "settings" },
  settings: { title: "Настройки", icon: Settings },
  system: { title: "Система", icon: Settings, parent: "settings" }
};

interface AppBreadcrumbProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AppBreadcrumb({ activeSection, onSectionChange }: AppBreadcrumbProps) {
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const current = sectionConfig[activeSection];
    if (!current) return [{ title: "Панель управления", href: "dashboard", icon: Home }];

    const breadcrumbs: BreadcrumbItem[] = [
      { title: "Главная", href: "dashboard", icon: Home }
    ];

    // Add parent if exists
    if (current.parent && sectionConfig[current.parent]) {
      const parent = sectionConfig[current.parent];
      breadcrumbs.push({
        title: parent.title,
        href: current.parent,
        icon: parent.icon
      });
    }

    // Add current page (no href for current page)
    breadcrumbs.push({
      title: current.title,
      icon: current.icon
    });

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <div key={item.title} className="flex items-center">
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink
                  className="flex items-center gap-1 hover:text-primary cursor-pointer"
                  onClick={() => onSectionChange(item.href!)}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.title}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.title}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}