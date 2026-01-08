import { useState } from "react";
import { Outlet } from 'react-router-dom';
import { AppShell } from "@mantine/core";
import { SideBar } from "./Sidebar";

export const AppLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    
    return (
        <AppShell
            navbar={{
                width: sidebarCollapsed ? 70 : 280,
                breakpoint: 'sm',
            }}
            padding={0}
            transitionDuration={700} // Adjust this value (in ms)
            transitionTimingFunction="ease" // Adjust easing
        >
            {/* NAVBAR (collapsible sidebar) */}
            <AppShell.Navbar>
                <SideBar
                    collapsed={sidebarCollapsed}
                    toggleCollapsed={() => setSidebarCollapsed((c) => !c)}
                />
            </AppShell.Navbar>
            <AppShell.Main>
                <Outlet/>
            </AppShell.Main>
        </AppShell>
    );
}