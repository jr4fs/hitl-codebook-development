import { useState } from "react";
import { Outlet } from "react-router-dom";
import { ActionIcon, AppShell, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { SideBar } from "./Sidebar";

export const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <AppShell
      navbar={{
        width: sidebarCollapsed ? 70 : 280,
        breakpoint: "xs",
      }}
      padding={0}
      transitionDuration={700} // Adjust this value (in ms)
      transitionTimingFunction="ease" // Adjust easing
      bg="var(--mantine-color-body)"
    >
      {/* NAVBAR (collapsible sidebar) */}
      <AppShell.Navbar>
        <SideBar
          collapsed={sidebarCollapsed}
          toggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        />
      </AppShell.Navbar>
      <AppShell.Main style={{ minHeight: "100dvh", position: "relative" }}>
        <ActionIcon
          variant="outline"
          radius="xl"
          size="xl"
          onClick={() =>
            setColorScheme(colorScheme === "dark" ? "light" : "dark")
          }
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 2000,
          }}
          title="Toggle color scheme"
        >
          {colorScheme === "dark" ? (
            <IconSun size={22} />
          ) : (
            <IconMoon size={22} />
          )}
        </ActionIcon>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
