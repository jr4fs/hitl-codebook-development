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
} from "@mantine/core";
import {
  IconSquarePlus,
  IconLayoutSidebar,
  IconUserCircle,
  IconFile,
  IconHistory,
  IconHome2,
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

  const modelNameMap: Record<string, string> = {
    "gemma3:1b": "Gemma3-1B",
    "qwen3.5:2b": "Qwen3.5-2B",
    "mistral:7b": "Mistral-7B",
    "qwen:32b": "Qwen-32B",
    "llama3.3:70b": "Llama3.3-70B",
  };

  const handleLogout = () => {
    dispatch(clearUser());
    navigate("/login");
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
        <Button
          fullWidth
          variant="transparent"
          size="xl"
          onClick={() => {
            navigate("/");
            toggleCollapsed();
          }}
          c="var(--app-sidebar-text)"
          h="auto"
          p="0"
          mt="10"
          bd="0px"
          classNames={{ root: "sidebar-button-collapsed sidebar-home-button" }}
        >
          <IconHome2 size={34} stroke={1.5} className="sidebar-home-icon" />
        </Button>
        <ActionIcon
          onClick={() => {
            navigate("/upload");
          }}
          w="100%"
          size="xl"
          radius="md"
          c="var(--app-sidebar-text)"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          <IconSquarePlus size={28} stroke={1.5} />
        </ActionIcon>

        <ActionIcon
          w="100%"
          size="xl"
          radius="md"
          c="var(--app-sidebar-text)"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          <IconHistory size={28} stroke={1.5} />
        </ActionIcon>

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
        <Stack h="auto" pl="md" pr="md" pt="md" pb="0px">
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
              <IconHome2 size={30} stroke={1.5} className="sidebar-home-icon" />
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
              navigate("/upload");
            }}
            fullWidth
            radius="md"
            c="var(--app-sidebar-text)"
            p="md"
            h="auto"
            justify="space-between"
            rightSection={<IconSquarePlus size={28} stroke={1.5} />}
            fz="md"
            classNames={{ root: "sidebar-button" }}
          >
            Create Task
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
          <Stack pl="md" pr="md" pt="md" pb="0px">
            {error ? (
              <Center>
                <Text c="var(--app-sidebar-text)"> {error} </Text>
              </Center>
            ) : (
              tasks.map((task) => (
                <Button
                  onClick={() => {
                    navigate(`/auto-annotate/${task._id}`);
                  }}
                  key={task._id}
                  fullWidth
                  radius="md"
                  c="var(--app-sidebar-text)"
                  p="md"
                  h="auto"
                  justify="space-between"
                  rightSection={<IconFile size={28} stroke={1.5} />}
                  fz="md"
                  classNames={{ root: "sidebar-button" }}
                >
                  <Stack gap={2}>
                    <Text>{task.name}</Text>
                    <Text fz="xs" c="dimmed" fw={400} ta="start">
                      {modelNameMap[task.modelName]}
                    </Text>
                  </Stack>
                </Button>
              ))
            )}
          </Stack>
        </ScrollArea>
        <Menu
          shadow="md"
          width={200}
          position="right-end"
          offset={8}
          classNames={{
            dropdown: "sidebar-menu-dropdown",
            item: "sidebar-menu-item",
          }}
        >
          <Menu.Target>
            <Button
              style={{ marginTop: "auto" }}
              radius="md"
              p="md"
              h="auto"
              fz="md"
              fullWidth
              justify="center"
              classNames={{ root: "sidebar-button sidebar-user-button" }}
            >
              <Flex align="center" justify="center" gap="xs">
                <IconUserCircle
                  size={28}
                  stroke={1.5}
                  className="sidebar-user-icon"
                />
                <Text>{user?.username}</Text>
              </Flex>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item color="red" onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Stack>
    );
  }
};
