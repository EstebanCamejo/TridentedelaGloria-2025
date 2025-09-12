import { TipoUsuario } from '../enumerados/tipo-usuario';

export interface Usuario {
  id: string;           // id de registro en tu tabla (o igual al auth_id)
  auth_id: string;      // id del usuario en Supabase Auth
  email: string;
  tipo: TipoUsuario;
  nombre?: string;
  apellido?: string;
  fotoUrl?: string;
}
