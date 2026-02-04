import {
  Text,
  Stack,
  Flex,
  Button,
  ActionIcon,
  ScrollArea,
} from "@mantine/core";
import {
  IconSquarePlus,
  IconLayoutSidebar,
  IconUserCircle,
  IconFile,
  IconHistory,
} from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import "./styles/Sidebar.css";
import { useState, useEffect } from "react";
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router";
import { getUserTasks } from "../../services/tasks.service";
import { IRootState } from "../../store/store";
import { Task } from "@common/types/tasks";

//Props to handle navbar collapsed/expanded state
interface SideBarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}


export const SideBar = ({ collapsed, toggleCollapsed }: SideBarProps) => {
  const { hovered, ref } = useHover();
  const user = useSelector((state: IRootState) => state.user.user);
  const accessToken = useSelector((state: IRootState) => state.user.accessToken);
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const userTasks = await getUserTasks();
        setTasks(userTasks.tasks || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [accessToken]);

  if (collapsed) {
    //Collapsed sidebar
    return (
      <Stack h="100%" bg="#1E1E1E" w="70px">
        <Button
          ref={ref}
          fullWidth
          variant="transparent"
          size="xl"
          onClick={toggleCollapsed}
          c="white"
          h="auto"
          p="0"
          mt="10"
          bd="0px"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          {hovered ? (
            <IconLayoutSidebar size={36} stroke={1.5} />
          ) : (
            <Text fz="36px" lh="1">
              AT
            </Text>
          )}
        </Button>
        <ActionIcon
        onClick={() => {
          navigate('/');
        }}
          w="100%"
          size="xl"
          radius="md"
          c="white"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          <IconSquarePlus size={28} stroke={1.5} />
        </ActionIcon>

        <ActionIcon
          w="100%"
          size="xl"
          radius="md"
          c="white"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          <IconHistory size={28} stroke={1.5} />
        </ActionIcon>

        <ActionIcon
          w="100%"
          size="xl"
          radius="md"
          c="white"
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
      <Stack h="100%" bg="#1E1E1E" w="280px">
        <Stack h="auto" pl="md" pr="md" pt="md" pb="0px">
          <Flex justify="space-between" direction="row">
            <Text c="white" fz="36px" pb="64px" onClick={() => {navigate('/');}}>
              AT
            </Text>
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
            navigate('/');
          }}
            fullWidth
            radius="md"
            c="white"
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
          <Stack pl="md" pr="md" pt="md" pb="0px">
            {tasks.map((task) => (
              <Button
              onClick={() => {
                navigate(`/new-task/${task._id}`);
              }}
                key={task._id}
                fullWidth
                radius="md"
                c="white"
                p="md"
                h="auto"
                justify="space-between"
                rightSection={<IconFile size={28} stroke={1.5} />}
                fz="md"
                classNames={{ root: "sidebar-button" }}
              >
                {task.name}
              </Button>
            ))}
          </Stack>
        </ScrollArea>
        <Button
          leftSection={<IconUserCircle size={28} stroke={1.5} />}
          style={{ marginTop: "auto" }}
          bg="#1C1A1A"
          radius="0px"
          p="lg"
          h="auto"
          fz="md"
          classNames={{ root: "sidebar-button" }}
        >
          {user?.username}
        </Button>
      </Stack>
    );
  }
};
