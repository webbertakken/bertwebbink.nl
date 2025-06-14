import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs'

const execAsync = promisify(exec)

export type ContainerCommand = 'start' | 'stop'

export interface ContainerCommandStep {
  step: string
  cmd: string
  stdout: string
  stderr: string
  success: boolean
  info?: boolean
}

export interface ContainerCommandResult {
  success: boolean
  message?: string
  error?: string
  details?: any
  steps: ContainerCommandStep[]
}

interface DockerError extends Error {
  stderr?: string
  stdout?: string
  info?: boolean
}

const DB_PASSWORD = 'P@ssw0rd!'
const CONTAINER_NAME = 'temp-mariadb'
const DB_NAME = 'wordpress'
const BACKUP_FILE = path.resolve(process.cwd(), 'input/database/backup.sql')

export async function executeContainerCommand(
  command: ContainerCommand,
): Promise<ContainerCommandResult> {
  const steps: ContainerCommandStep[] = []
  function extractOutput(res: { stdout?: string; stderr?: string; message?: string } | Error): {
    stdout: string
    stderr: string
  } {
    if (res instanceof Error) {
      // Some exec errors have stdout/stderr attached
      const errObj = res as Error & { stdout?: string; stderr?: string; message?: string }
      return {
        stdout: typeof errObj.stdout === 'string' ? errObj.stdout : '',
        stderr:
          typeof errObj.stderr === 'string'
            ? errObj.stderr
            : typeof errObj.message === 'string'
              ? errObj.message
              : res.message,
      }
    } else {
      return {
        stdout: res.stdout ?? '',
        stderr: res.stderr ?? res.message ?? '',
      }
    }
  }
  function pushStep(
    step: string,
    cmd: string,
    res: { stdout?: string; stderr?: string; message?: string; info?: boolean } | Error,
    success: boolean,
  ) {
    const { stdout, stderr } = extractOutput(res)
    const infoValue =
      res && typeof (res as { info?: unknown }).info === 'boolean'
        ? (res as { info: boolean }).info
        : undefined
    steps.push({
      step,
      cmd,
      stdout,
      stderr,
      success,
      ...(infoValue !== undefined ? { info: infoValue } : {}),
    })
  }
  function getErrorDetails(
    error: unknown,
  ): { stack?: string; stdout?: string; stderr?: string; code?: string | number } | undefined {
    if (typeof error === 'object' && error !== null) {
      const e = error as Partial<
        Error & { stdout?: string; stderr?: string; code?: string | number }
      >
      return {
        stack: typeof e.stack === 'string' ? e.stack : undefined,
        stdout: typeof e.stdout === 'string' ? e.stdout : undefined,
        stderr: typeof e.stderr === 'string' ? e.stderr : undefined,
        code: typeof e.code === 'string' || typeof e.code === 'number' ? e.code : undefined,
      }
    }
    return undefined
  }
  try {
    if (command === 'start') {
      // 1. Start MariaDB container
      let res: { stdout: string; stderr: string } | Error
      try {
        res = await execAsync(
          `docker run --name ${CONTAINER_NAME} -e MARIADB_ROOT_PASSWORD=\"${DB_PASSWORD}\" -d -p 3306:3306 mariadb:latest`,
        )
        const isSuccess = !(res.stderr && res.stderr.trim())
        pushStep(
          'Start container',
          `docker run --name ${CONTAINER_NAME} -e MARIADB_ROOT_PASSWORD=\"${DB_PASSWORD}\" -d -p 3306:3306 mariadb:latest`,
          res,
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to start container', steps }
      } catch (err: unknown) {
        pushStep(
          'Start container',
          `docker run --name ${CONTAINER_NAME} -e MARIADB_ROOT_PASSWORD=\"${DB_PASSWORD}\" -d -p 3306:3306 mariadb:latest`,
          err as Error,
          false,
        )
        return { success: false, error: 'Failed to start container', steps }
      }
      // 2. Wait for MariaDB to initialize
      await new Promise((resolve) => setTimeout(resolve, 10000))
      pushStep('Wait for MariaDB to initialize', 'sleep 10s', { stdout: 'Waited 10s' }, true)
      // 3. Create the target database
      try {
        res = await execAsync(
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"`,
        )
        const isSuccess = !(res.stderr && res.stderr.trim())
        pushStep(
          'Create database',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"`,
          res,
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to create database', steps }
      } catch (err: unknown) {
        pushStep(
          'Create database',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"`,
          err as Error,
          false,
        )
        return { success: false, error: 'Failed to create database', steps }
      }
      // 4. Import the dump
      try {
        const importResult = await new Promise<{ stdout: string; stderr: string }>(
          (resolve, reject) => {
            const stream = fs.createReadStream(BACKUP_FILE)
            const child = spawn('docker', [
              'exec',
              '-i',
              CONTAINER_NAME,
              'mariadb',
              '-uroot',
              `-p${DB_PASSWORD}`,
              DB_NAME,
            ])
            let stdout = '',
              stderr = ''
            child.stdout.on('data', (data) => {
              stdout += data.toString()
            })
            child.stderr.on('data', (data) => {
              stderr += data.toString()
            })
            child.on('close', (code) => {
              if (code === 0) resolve({ stdout, stderr })
              else reject(new Error(stderr || `Exited with code ${code}`))
            })
            child.on('error', reject)
            stream.pipe(child.stdin)
          },
        )
        const isSuccess = !(importResult.stderr && importResult.stderr.trim())
        pushStep(
          'Import dump',
          `docker exec -i ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" ${DB_NAME} < backup.sql`,
          importResult,
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to import dump', steps }
      } catch (err: unknown) {
        pushStep(
          'Import dump',
          `docker exec -i ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" ${DB_NAME} < backup.sql`,
          err as Error,
          false,
        )
        return { success: false, error: 'Failed to import dump', steps }
      }
      // 5. Inspect databases
      try {
        res = await execAsync(
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "SHOW DATABASES;"`,
        )
        const isSuccess = !(res.stderr && res.stderr.trim())
        pushStep(
          'Inspect databases',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "SHOW DATABASES;"`,
          res,
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to inspect databases', steps }
      } catch (err: unknown) {
        pushStep(
          'Inspect databases',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "SHOW DATABASES;"`,
          err as Error,
          false,
        )
        return { success: false, error: 'Failed to inspect databases', steps }
      }

      // Show all tables in the database
      try {
        res = await execAsync(
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "USE ${DB_NAME}; SHOW TABLES;"`,
        )
        const isSuccess = !(res.stderr && res.stderr.trim())
        pushStep(
          'List tables',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "USE ${DB_NAME}; SHOW TABLES;"`,
          res,
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to list tables', steps }
      } catch (err: unknown) {
        pushStep(
          'List tables',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "USE ${DB_NAME}; SHOW TABLES;"`,
          err as Error,
          false,
        )
        return { success: false, error: 'Failed to list tables', steps }
      }

      // Count posts by type
      try {
        res = await execAsync(
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "USE ${DB_NAME}; SELECT post_type, COUNT(*) as count FROM wp_posts GROUP BY post_type ORDER BY count DESC;"`,
        )
        const isSuccess = !(res.stderr && res.stderr.trim())
        pushStep(
          'Count posts by type',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "USE ${DB_NAME}; SELECT post_type, COUNT(*) as count FROM wp_posts GROUP BY post_type ORDER BY count DESC;"`,
          res,
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to count posts', steps }
      } catch (err: unknown) {
        pushStep(
          'Count posts by type',
          `docker exec ${CONTAINER_NAME} mariadb -uroot -p\"${DB_PASSWORD}\" -e "USE ${DB_NAME}; SELECT post_type, COUNT(*) as count FROM wp_posts GROUP BY post_type ORDER BY count DESC;"`,
          err as Error,
          false,
        )
        return { success: false, error: 'Failed to count posts', steps }
      }

      return {
        success: true,
        message: 'MariaDB container started and database imported.',
        steps,
      }
    } else if (command === 'stop') {
      // Stop and remove the container
      let res: { stdout: string; stderr: string } | Error
      try {
        res = await execAsync(`docker stop ${CONTAINER_NAME}`)
        const isNoSuchContainer = res.stderr && res.stderr.includes('No such container')
        const isSuccess = !(res.stderr && res.stderr.trim()) || isNoSuchContainer
        pushStep(
          'Stop container',
          `docker stop ${CONTAINER_NAME}`,
          { ...res, info: isNoSuchContainer },
          isSuccess,
        )
        // continue to try remove
      } catch (err: unknown) {
        // If error is 'No such container', treat as info/success
        if (
          err instanceof Error &&
          (err as DockerError).stderr &&
          (err as DockerError).stderr.includes('No such container')
        ) {
          pushStep(
            'Stop container',
            `docker stop ${CONTAINER_NAME}`,
            { ...err, info: true } as DockerError,
            true,
          )
        } else {
          pushStep('Stop container', `docker stop ${CONTAINER_NAME}`, err as DockerError, false)
        }
        // continue to try remove
      }
      try {
        res = await execAsync(`docker rm ${CONTAINER_NAME}`)
        const isNoSuchContainer = res.stderr && res.stderr.includes('No such container')
        const isSuccess = !(res.stderr && res.stderr.trim()) || isNoSuchContainer
        pushStep(
          'Remove container',
          `docker rm ${CONTAINER_NAME}`,
          { ...res, info: isNoSuchContainer },
          isSuccess,
        )
        if (!isSuccess) return { success: false, error: 'Failed to remove container', steps }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err as DockerError).stderr &&
          (err as DockerError).stderr.includes('No such container')
        ) {
          pushStep(
            'Remove container',
            `docker rm ${CONTAINER_NAME}`,
            { ...err, info: true } as DockerError,
            true,
          )
        } else {
          pushStep('Remove container', `docker rm ${CONTAINER_NAME}`, err as DockerError, false)
          return { success: false, error: 'Failed to remove container', steps }
        }
      }
      return {
        success: true,
        message: steps.some((step) => step.info)
          ? `Container '${CONTAINER_NAME}' was already not running.`
          : `MariaDB container '${CONTAINER_NAME}' torn down.`,
        steps,
      }
    } else {
      return {
        success: false,
        error: 'Unknown command',
        steps,
      }
    }
  } catch (error: unknown) {
    pushStep('Unexpected error', '', error as Error, false)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: getErrorDetails(error),
      steps,
    }
  }
}
