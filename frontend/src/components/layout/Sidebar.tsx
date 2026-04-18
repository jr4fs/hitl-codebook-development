import {
  Text,
  Stack,
  Flex,
  Button,
  ActionIcon,
  ScrollArea,
  Menu,
  Center,
  LoadingOverlay,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconLayoutSidebar,
  IconUserCircle,
  IconBook2,
  IconPencil,
  IconDots,
  IconTrash,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import "./styles/Sidebar.css";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { getUserTasks } from "../../services/tasks.service";
import { IRootState } from "../../store/store";
import { Task } from "@common/types/tasks";
import { clearUser } from "../../store/userSlice";

//Props to handle navbar collapsed/expanded state
interface SideBarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export const SideBar = ({ collapsed, toggleCollapsed }: SideBarProps) => {
  const user = useSelector((state: IRootState) => state.user.user);
  const accessToken = useSelector(
    (state: IRootState) => state.user.accessToken,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const handleLogout = () => {
    dispatch(clearUser());
    navigate("/login");
  };
  const handleDeleteTask = (task: Task) => {
    // TODO: wire to delete endpoint when available.
    console.warn("Delete task not implemented yet:", task._id);
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>();

  const fetchTasks = async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const userTasks = await getUserTasks();
      setTasks(userTasks.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user tasks, updates with every access token refresh
  useEffect(() => {
    fetchTasks();
  }, [accessToken]);

  useEffect(() => {
    const handleTaskUpdate = () => {
      fetchTasks();
    };

    window.addEventListener("tasks:updated", handleTaskUpdate);
    return () => {
      window.removeEventListener("tasks:updated", handleTaskUpdate);
    };
  }, [accessToken]);

  if (collapsed) {
    //Collapsed sidebar
    return (
      <Stack
        h="100%"
        bg="var(--app-sidebar-bg)"
        w="70px"
        className="sidebar-shell"
      >
        <Tooltip label="Expand Sidebar" position="top" withArrow>
          <Button
            fullWidth
            variant="transparent"
            size="xl"
            onClick={() => {
              toggleCollapsed();
            }}
            c="var(--app-sidebar-text)"
            h="auto"
            p="0"
            mt="10"
            bd="0px"
            classNames={{ root: "sidebar-button-collapsed sidebar-home-button" }}
          >
            <span className="sidebar-home-logo-wrap">
              <img
                src="/annotate-icon.svg"
                alt="Annotate logo"
                className="sidebar-home-logo sidebar-home-logo-collapsed"
              />
              <IconLayoutSidebar
                size={30}
                stroke={1.8}
                className="sidebar-home-expand-icon"
              />
            </span>
          </Button>
        </Tooltip>
        <Tooltip label="Create Codebook" position="top" withArrow>
          <ActionIcon
            onClick={() => {
              navigate("/new-codebook");
            }}
            w="100%"
            size="xl"
            radius="md"
            c="var(--app-sidebar-text)"
            variant="subtle"
            classNames={{ root: "sidebar-button-collapsed" }}
          >
            <IconBook2 size={24} stroke={1.6} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Annotate Dataset" position="top" withArrow>
          <ActionIcon
            onClick={() => {
              navigate("/new-annotation");
            }}
            w="100%"
            size="xl"
            radius="md"
            c="var(--app-sidebar-text)"
            variant="subtle"
            classNames={{ root: "sidebar-button-collapsed" }}
          >
            <IconPencil size={24} stroke={1.6} />
          </ActionIcon>
        </Tooltip>

        <Menu
          shadow="md"
          width={200}
          position="top-start"
          offset={6}
          classNames={{
            dropdown: "sidebar-menu-dropdown",
            item: "sidebar-menu-item",
          }}
        >
          <Menu.Target>
            <ActionIcon
              w="100%"
              size="xl"
              radius="md"
              c="var(--app-sidebar-text)"
              variant="subtle"
              classNames={{ root: "sidebar-button-collapsed" }}
              style={{ marginTop: "auto" }}
            >
              <IconUserCircle size={28} stroke={1.5} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={
                colorScheme === "dark" ? (
                  <IconSun size={14} />
                ) : (
                  <IconMoon size={14} />
                )
              }
              onClick={() =>
                setColorScheme(colorScheme === "dark" ? "light" : "dark")
              }
            >
              {colorScheme === "dark" ? "Light mode" : "Dark mode"}
            </Menu.Item>
            <Menu.Item color="red" onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Stack>
    );
  } else {
    //Expanded sidebar
    return (
      <Stack
        h="100%"
        bg="var(--app-sidebar-bg)"
        w="280px"
        className="sidebar-shell"
      >
        <Stack h="auto" pl="md" pr="md" pt="md" pb="0px" gap={6}>
          <Flex justify="space-between" direction="row">
            <ActionIcon
              variant="transparent"
              size="lg"
              c="var(--app-sidebar-text)"
              onClick={() => {
                navigate("/");
              }}
              bd="0"
              title="Home"
              className="sidebar-home-button"
            >
              <img
                src="/annotate-icon.svg"
                alt="Annotate logo"
                className="sidebar-home-logo sidebar-home-logo-expanded"
              />
            </ActionIcon>
            <ActionIcon
              variant="transparent"
              size="lg"
              c="dimmed"
              onClick={toggleCollapsed}
              bd="0"
            >
              <IconLayoutSidebar />
            </ActionIcon>
          </Flex>

          <Button
            onClick={() => {
              navigate("/new-codebook");
            }}
            fullWidth
            radius="md"
            c="var(--app-sidebar-text)"
            px="sm"
            h={36}
            justify="flex-start"
            leftSection={<IconBook2 size={16} stroke={1.8} />}
            fz="sm"
            classNames={{ root: "sidebar-button sidebar-create-row" }}
          >
            Create Codebook
          </Button>

          <Button
            onClick={() => {
              navigate("/new-annotation");
            }}
            fullWidth
            radius="md"
            c="var(--app-sidebar-text)"
            px="sm"
            h={36}
            justify="flex-start"
            leftSection={<IconPencil size={16} stroke={1.8} />}
            fz="sm"
            classNames={{ root: "sidebar-button sidebar-create-row" }}
          >
            Annotate Dataset
          </Button>

          <Text c="dimmed">Your Tasks</Text>
        </Stack>
        <ScrollArea h="auto" type="auto">
          <LoadingOverlay
            visible={loading}
            zIndex={1000}
            overlayProps={{
              radius: "sm",
              blur: 2,
              color: "var(--app-sidebar-bg)",
            }}
            loaderProps={{ color: "var(--app-sidebar-text)", type: "bars" }}
          />
          <Stack pl="sm" pr="sm" pt="xs" pb="0px" gap={4}>
            {error ? (
              <Center>
                <Text c="var(--app-sidebar-text)"> {error} </Text>
              </Center>
            ) : (
              tasks.map((task) => (
                <div key={task._id} className="sidebar-task-row-wrap">
                  <Button
                    onClick={() => {
                      navigate(`/codebook-creation/${task._id}`);
                    }}
                    fullWidth
                    radius="md"
                    c="var(--app-sidebar-text)"
                    px="sm"
                    h={36}
                    justify="flex-start"
                    fz="sm"
                    classNames={{ root: "sidebar-task-row" }}
                  >
                    <Text className="sidebar-task-title">{task.name}</Text>
                  </Button>
                  <Menu
                    shadow="md"
                    width={160}
                    position="bottom-end"
                    offset={6}
                    classNames={{
                      dropdown: "sidebar-menu-dropdown",
                      item: "sidebar-menu-item",
                    }}
                  >
                    <Menu.Target>
                      <button
                        type="button"
                        className="sidebar-task-menu-trigger"
                        aria-label={`Task options for ${task.name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <IconDots size={16} stroke={1.8} />
                      </button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} stroke={1.8} />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteTask(task);
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </div>
              ))
            )}
          </Stack>
        </ScrollArea>
        <Menu
          shadow="md"
          width={200}
          position="top-start"
          offset={6}
          classNames={{
            dropdown: "sidebar-menu-dropdown",
            item: "sidebar-menu-item",
          }}
        >
          <Menu.Target>
            <Button
              style={{ marginTop: "auto" }}
              radius="md"
              px="sm"
              h={40}
              fz="sm"
              fullWidth
              justify="flex-start"
              leftSection={
                <IconUserCircle
                  size={18}
                  stroke={1.8}
                  className="sidebar-user-icon"
                />
              }
              classNames={{ root: "sidebar-button sidebar-user-button" }}
            >
              <Text className="sidebar-user-name">{user?.username}</Text>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={
                colorScheme === "dark" ? (
                  <IconSun size={14} />
                ) : (
                  <IconMoon size={14} />
                )
              }
              onClick={() =>
                setColorScheme(colorScheme === "dark" ? "light" : "dark")
              }
            >
              {colorScheme === "dark" ? "Light mode" : "Dark mode"}
            </Menu.Item>
            <Menu.Item color="red" onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Stack>
    );
  }
};
