import type { SupabaseClient } from '@supabase/supabase-js';
import type { Usuario } from './type';
import { PerfilDB } from '../perfiles/db';
import type { Perfil } from '../perfiles/type';
import { validar } from './validaciones';

export const UsuarioDB = {
	async registrarUsuario(supabase: SupabaseClient, { email, password }: Usuario) {
		validar.validarEmail(email);
		validar.validarPassword(password);

		const { data, error } = await supabase.auth.signUp({ email, password });

		if (error) {
			throw new Error(`Error al crear la cuenta del usuario.`);
		}

		const userId = data.user?.id;
		const userEmail = data.user?.email;

		const perfil: Perfil = {
			id: userId as string,
			nombres: 'Sin nombres',
			apellido_paterno: 'Sin apellido paterno',
			apellido_materno: 'Sin apellido materno',
			dni: 'Sin DNI',
			rol: 'Estudiante',
			email: userEmail as string,
			fecha_creacion: new Date().toISOString(),
			fecha_actualizacion: new Date().toISOString()
		};

		try {
			await PerfilDB.crearPerfil(supabase, perfil);
		} catch (error) {
			console.error('Error al crear el perfil del usuario:', error);
		}
	},

	async iniciarSesion(supabase: SupabaseClient, { email, password }: Usuario) {
		validar.validarEmail(email);
		// validar.validarPassword(password);

		const {
			data: { user },
			error
		} = await supabase.auth.signInWithPassword({ email, password });

		if (error) throw new Error('Error al iniciar sesión.');

		const { data: perfil, error: perfilError } = await supabase
			.from('Perfiles')
			.select('rol')
			.eq('id', user?.id)
			.single();

		if (perfilError) throw new Error('Error al obtener el rol del usuario.');

		const { error: metadataError } = await supabase.auth.updateUser({
			data: { rol: perfil.rol }
		});

		if (metadataError) throw new Error('Error al actualizar el rol del usuario.');
	},

	async cambiarContrasena(
		supabase: SupabaseClient,
		email: string,
		currentPassword: string,
		newPassword: string,
		confirmPassword: string
	) {
		await validar.validarCurrentPassword(supabase, email, currentPassword);
		validar.validarNewPassword(currentPassword, newPassword, confirmPassword);

		const { error: updateError } = await supabase.auth.updateUser({
			password: newPassword
		});

		if (updateError) {
			throw new Error('Error al actualizar la contraseña');
		}

		return { success: 'Contraseña actualizada correctamente' };
	}
};
