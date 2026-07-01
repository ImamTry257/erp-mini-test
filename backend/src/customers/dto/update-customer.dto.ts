import { IsEmail, IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
