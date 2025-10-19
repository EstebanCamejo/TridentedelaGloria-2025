import { TipoUsuario } from '../enumerados/tipo-usuario';

export interface Usuario {
  id: string;           // id de registro en tu tabla (o igual al auth_id)
  auth_id: string;      // id del usuario en Supabase Auth
  email: string;
  perfil: TipoUsuario;  // campo en la base de datos se llama 'perfil'
  nombres?: string;     // campo en la base de datos se llama 'nombres'
  apellidos?: string;   // campo en la base de datos se llama 'apellidos'
  foto_url?: string;    // campo en la base de datos se llama 'foto_url'
  estado?: string;      // estado del usuario (aprobado, pendiente, etc.)
}
