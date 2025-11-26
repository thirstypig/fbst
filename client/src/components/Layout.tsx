import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const links = [
    { label: "Period", to: "/standings" },
    { label: "Season", to: "/standings/season" },
    { label: "Categories", to: "/standings/categories" },
    { label: "Teams", to: "/teams" },
    { label: "Auction", to: "/auction" },
    { label: "Periods", to: "/periods" },
  ];
  

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-card flex flex-col">
        <div className="px-4 py-3 border-b">
          <div className="text-lg font-semibold tracking-tight">FBST</div>
          <div className="text-xs text-muted-foreground">OGBA Stat Tool</div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-2 text-[11px] text-muted-foreground border-t">
          OGBA • Fantasy Baseball
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <header className="border-b px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            OGBA Fantasy Baseball Stat Tool
          </div>
        </header>
        <Separator />
        <div className="flex-1 overflow-auto px-6 py-4">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
