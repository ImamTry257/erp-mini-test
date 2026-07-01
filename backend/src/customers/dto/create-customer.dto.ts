import { IsEmail, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
