import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { setAuth } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const response = await axiosClient.post(ENDPOINTS.auth.login, data);
      const { user, token } = response.data;
      
      await setAuth(user, token);
      
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: `Logged in as ${user.fullName}`,
      });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Login failed';
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-[#09090b]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="p-6">
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-white tracking-widest">OptiFlow</Text>
          <Text className="text-[#a1a1aa] mt-2 text-base">Manage tasks seamlessly</Text>
        </View>

        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6">
          <Text className="text-2xl font-bold text-white mb-6">Sign In</Text>

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2">Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-3 mb-1 text-[15px]"
                placeholder="you@example.com"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
          />
          {errors.email && (
            <Text className="text-[#ef4444] text-xs mb-4">{errors.email.message}</Text>
          )}

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-3 mb-1 text-[15px]"
                placeholder="Min. 8 characters"
                placeholderTextColor="#71717a"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
              />
            )}
          />
          {errors.password && (
            <Text className="text-[#ef4444] text-xs mb-4">{errors.password.message}</Text>
          )}

          <TouchableOpacity
            className="bg-[#6366f1] rounded-lg py-3.5 items-center mt-6 flex-row justify-center"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" className="mr-2" />
            ) : null}
            <Text className="text-white text-base font-bold">Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-6 py-2"
            onPress={() => navigation.navigate('Register')}
          >
            <Text className="text-[#a1a1aa] text-sm underline">Create a new Workspace</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
