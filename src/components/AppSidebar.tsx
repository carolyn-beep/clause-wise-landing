import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Upload, History, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Upload", url: "/app", icon: Upload },
  { title: "History", url: "/app/history", icon: History },
  { title: "Account", url: "/app/account", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/app") {
      return currentPath === "/app" || currentPath === "/app/upload";
    }
    return currentPath === path;
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <div className="p-4">
        <Link to="/" className={`text-xl font-bold bg-gradient-hero bg-clip-text text-transparent ${isCollapsed ? "text-center" : ""}`}>
          {isCollapsed ? "C" : "ClauseWise"}
        </Link>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : "hover:bg-accent"}
                  >
                    <Link to={item.url} className="flex items-center">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4">
        <Link to="/">
          <Button variant="ghost" size={isCollapsed ? "icon" : "default"} className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </Link>
      </div>

      <SidebarTrigger className="absolute -right-3 top-4" />
    </Sidebar>
  );
}