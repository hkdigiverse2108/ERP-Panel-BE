import { IPermissions } from './permission';

export interface IUser {
    fullName?: string;
    email?: string;
    phoneNo?: string;
    profileImage?: string;
    isActive?: boolean;
    password?: string;
    role?: 'admin' | 'superAdmin' | 'user'
    permissions: IPermissions
}