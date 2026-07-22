import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../context/AuthContext';
import { parseApiError } from '../../api/errors';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '../ui/field';

const formSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username cannot exceed 30 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password cannot exceed 72 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export function RegisterForm() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await authRegister(data);
      navigate('/');
    } catch (error) {
      const parsedError = parseApiError(error);
      
      if (parsedError.fieldErrors) {
        Object.entries(parsedError.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof FormValues, { type: 'server', message });
        });
      } else {
        toast.error(parsedError.message || 'An error occurred during registration.');
      }
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8 font-['Geist']">
      <div className="space-y-3">
        <Link to="/" className="inline-block" title="Back to Home">
          <img src="/logo.png" alt="Caption Roulette Logo" className="w-10 h-10 object-contain" />
        </Link>
        <h1 className="text-3xl font-bold font-['Bricolage_Grotesque'] tracking-tight">Create Account</h1>
        <p className="text-gray-400">Join Caption Roulette to start playing.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Field data-invalid={!!errors.username}>
            <FieldLabel htmlFor="username" className="text-white">Username</FieldLabel>
            <Input
              id="username"
              placeholder="johndoe"
              className="h-12 bg-transparent border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-white"
              aria-invalid={!!errors.username}
              {...register('username')}
            />
            {errors.username && <FieldError className="text-red-400">{errors.username.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email" className="text-white">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              className="h-12 bg-transparent border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-white"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && <FieldError className="text-red-400">{errors.email.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password" className="text-white">Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="h-12 bg-transparent border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-white pr-10"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <FieldError className="text-red-400">{errors.password.message}</FieldError>}
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          className="w-full h-12 bg-white text-black hover:bg-gray-200 mt-6 text-base font-medium rounded-lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
          {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white hover:underline underline-offset-4">
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
