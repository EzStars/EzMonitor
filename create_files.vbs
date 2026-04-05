Set objFSO = CreateObject("Scripting.FileSystemObject")

Dim baseDir, typesDir, apiDir
baseDir = "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app"
typesDir = baseDir & "\src\types"
apiDir = baseDir & "\src\api"

' Create directories
If Not objFSO.FolderExists(typesDir) Then
    objFSO.CreateFolder(typesDir)
    WScript.Echo "Created: " & typesDir
End If

If Not objFSO.FolderExists(apiDir) Then
    objFSO.CreateFolder(apiDir)
    WScript.Echo "Created: " & apiDir
End If

' Create api.ts
Dim apiTypesContent
apiTypesContent = "/**" & vbCrLf & _
 " * API 响应通用结构" & vbCrLf & _
 " */" & vbCrLf & _
 "export interface ApiResponse<T = any> {" & vbCrLf & _
 "  code: number;" & vbCrLf & _
 "  message: string;" & vbCrLf & _
 "  data: T;" & vbCrLf & _
 "}" & vbCrLf & vbCrLf & _
 "/**" & vbCrLf & _
 " * 分页请求参数" & vbCrLf & _
 " */" & vbCrLf & _
 "export interface PaginationParams {" & vbCrLf & _
 "  page: number;" & vbCrLf & _
 "  pageSize: number;" & vbCrLf & _
 "}" & vbCrLf & vbCrLf & _
 "/**" & vbCrLf & _
 " * 分页响应数据" & vbCrLf & _
 " */" & vbCrLf & _
 "export interface PaginationResponse<T = any> {" & vbCrLf & _
 "  list: T[];" & vbCrLf & _
 "  total: number;" & vbCrLf & _
 "  page: number;" & vbCrLf & _
 "  pageSize: number;" & vbCrLf & _
 "}" & vbCrLf & vbCrLf & _
 "/**" & vbCrLf & _
 " * API 错误响应" & vbCrLf & _
 " */" & vbCrLf & _
 "export interface ApiError {" & vbCrLf & _
 "  code: number;" & vbCrLf & _
 "  message: string;" & vbCrLf & _
 "  details?: any;" & vbCrLf & _
 "}"

Set objFile = objFSO.CreateTextFile(typesDir & "\api.ts")
objFile.Write(apiTypesContent)
objFile.Close
WScript.Echo "Created: " & typesDir & "\api.ts"

' Create client.ts file - will be too long for this VB approach
' Instead, let's use Python via cmd
Dim objWshShell
Set objWshShell = CreateObject("WScript.Shell")
objWshShell.Run "cmd /c cd " & baseDir & " && python create_files_direct.py", 1, True
