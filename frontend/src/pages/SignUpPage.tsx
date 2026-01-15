import {
  TextInput,
  PasswordInput,
  Button,
  Group,
  Center,
  Text,
  Stack,
  Paper,
  BackgroundImage,
  Anchor,
  Box,
  Checkbox,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconExclamationMark } from "@tabler/icons-react";
import { Link, /*useNavigate*/ } from "react-router-dom";
import { useState } from "react";
import { CreateUserRequest } from "@common/types/accounts";
import { createUser } from "../services/account.service";
import { AxiosError } from "axios";
import { useDispatch } from 'react-redux';
import { setUser } from '../store/userSlice';

export default function SignUpPage() {
  //const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      username: "",
      email: "",
      password: "",
      rememberMe: true,
    },
    onSubmitPreventDefault: "always",
    validate: {
      email: (value: string) =>
        /^\S+@\S+\.\S+$/.test(value) ? null : "Invalid email",
      password: (value: string) =>
        value.length >= 8 ? null : "Must be at least 8 characters",
    },
  });

  const handleSubmit = async (values: CreateUserRequest) => {
    setLoading(true);
    setError("");
    try {
      const res = await createUser(values);
      console.log("Created user successfully:", res);
      // TODO: store auth token (JWT) / redirect user to landing page
      dispatch(setUser(res.user));
      setLoading(false);
    } catch (error) {
        console.error("Error creating user: ", error);
        if (error instanceof AxiosError){
             const errorMessage =
        error?.response?.data?.message ||
        error?.message
        setError(errorMessage);
        }
        else{
            setError("Failed creating user. Internal Server Error");
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundImage src="/paint.jpg" radius="xs" w="100vw" h="100vh">
      <Center w="100%" h="100%">
        <Paper c="white" bg="#343434" p="40" w="500" radius="xl" shadow="xl">
          <Stack gap="xl">
            <Text size="32px" fw={900} c="#50C878" ta="center">
              Welcome to the Annotation Tool
            </Text>
            {error.length > 0 && (
              <Alert
                variant="light"
                color="red"
                title={error}
                icon={<IconExclamationMark />}
              />
            )}
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="lg">
                <TextInput
                  size="lg"
                  radius="md"
                  withAsterisk
                  label="Username"
                  rightSection="@"
                  placeholder="username"
                  key={form.key("username")}
                  {...form.getInputProps("username")}
                />
                <TextInput
                  size="lg"
                  radius="md"
                  withAsterisk
                  label="Email"
                  rightSection="@"
                  placeholder="your@email.com"
                  key={form.key("email")}
                  {...form.getInputProps("email")}
                />
                <PasswordInput
                  size="lg"
                  radius="md"
                  withAsterisk
                  label="Password"
                  placeholder="your password"
                  key={form.key("password")}
                  {...form.getInputProps("password")}
                />
                <Group justify="flex-start" mt="md">
                  <Button
                    bg="#50C878"
                    type="submit"
                    size="lg"
                    fullWidth
                    loading={loading}
                  >
                    Sign Up
                  </Button>
                </Group>
                <Checkbox
                  color="#50C878"
                  mt="md"
                  label="Remember me"
                  key={form.key("rememberMe")}
                  {...form.getInputProps("rememberMe", { type: "checkbox" })}
                />
              </Stack>
            </form>
            <Box>
              <Text ta="center">
                Have an account already?{" "}
                <Anchor component={Link} to="/login" c="#50C878">
                  Login
                </Anchor>
              </Text>
            </Box>
          </Stack>
        </Paper>
      </Center>
    </BackgroundImage>
  );
}
