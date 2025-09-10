import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Users, 
  FileText, 
  TrendingUp, 
  Bot,
  Shield,
  Settings,
  Crown,
  Star,
  DollarSign,
  Building,
  Search,
  Menu
} from "lucide-react";

const navigationItems = [
  {
    title: "Панель управления",
    url: "#dashboard",
    icon: Activity,
    items: []
  },
  {
    title: "Работники",
    url: null, // Group only - no direct URL
    icon: Users,
    items: [
      { title: "Список работников", url: "#workers", icon: Users },
      { title: "Рейтинг работников", url: "#workers-rating", icon: Star },
      { title: "Управление навыками", url: "#add-worker", icon: Crown }
    ]
  },
  {
    title: "Проекты", 
    url: null, // Group only - no direct URL
    icon: Building,
    items: [
      { title: "Список проектов", url: "#projects", icon: Building },
      { title: "Управление расходами", url: "#expenses", icon: DollarSign }
    ]
  },
  {
    title: "Клиенты",
    url: null, // Group only - no direct URL
    icon: Users,
    items: [
      { title: "Список клиентов", url: "#clients", icon: Users }
    ]
  },
  {
    title: "Отчеты",
    url: "#reports",
    icon: FileText,
    items: []
  },
  {
    title: "Аналитика",
    url: "#analytics", 
    icon: TrendingUp,
    items: []
  },
  {
    title: "Безопасность",
    url: "#security",
    icon: Shield,
    items: []
  },
  {
    title: "Настройки",
    url: null, // Group only - no direct URL
    icon: Settings,
    items: [
      { title: "Telegram бот", url: "#telegram", icon: Bot },
      { title: "AI настройки", url: "#ai-settings", icon: Settings }
    ]
  }
];

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["workers", "projects", "clients", "settings"]);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const isActive = (url: string | null) => {
    if (!url) return false;
    const section = url.replace('#', '');
    return activeSection === section;
  };

  const collapsed = state === "collapsed";
  
  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} sidebar-transition`} 
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">СтройМенеджер</h2>
              <p className="text-xs text-sidebar-foreground/70 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Защищенная система
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {navigationItems.map((group) => (
          <SidebarGroup key={group.title}>
            
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild={group.url !== null}
                    isActive={isActive(group.url)}
                    onClick={() => {
                      if (group.url) {
                        // Single item - navigate
                        const section = group.url.replace('#', '');
                        onSectionChange(section);
                      } else if (group.items.length > 0) {
                        // Group with subitems - only toggle
                        toggleGroup(group.title);
                      }
                    }}
                  >
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors">
                      <group.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{group.title}</span>
                          {group.items.length > 0 && (
                            <Menu className={`h-4 w-4 transition-transform ${
                              expandedGroups.includes(group.title) ? 'rotate-90' : ''
                            }`} />
                          )}
                        </>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Submenu items */}
                {!collapsed && expandedGroups.includes(group.title) && group.items.map((item) => (
                  <SidebarMenuItem key={item.url} className="ml-4">
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive(item.url)}
                      onClick={() => {
                        const section = item.url.replace('#', '');
                        onSectionChange(section);
                      }}
                    >
                      <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors text-sm">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/50 text-center">
            Версия 3.0 • Этап 3 • AI + Телеграм
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}