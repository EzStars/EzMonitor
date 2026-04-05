@echo off
REM Create directories
mkdir "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\types" 2>nul
mkdir "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\api" 2>nul

REM Create api.ts
(
echo /**
echo  * API 响应通用结构
echo  */
echo export interface ApiResponse^<T = any^> {
echo   code: number;
echo   message: string;
echo   data: T;
echo }
echo.
echo /**
echo  * 分页请求参数
echo  */
echo export interface PaginationParams {
echo   page: number;
echo   pageSize: number;
echo }
echo.
echo /**
echo  * 分页响应数据
echo  */
echo export interface PaginationResponse^<T = any^> {
echo   list: T[];
echo   total: number;
echo   page: number;
echo   pageSize: number;
echo }
echo.
echo /**
echo  * API 错误响应
echo  */
echo export interface ApiError {
echo   code: number;
echo   message: string;
echo   details?: any;
echo }
) > "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\types\api.ts"

echo Done
