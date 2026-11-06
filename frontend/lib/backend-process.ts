import { resolve } from 'path'

export const BACKEND_DIR = process.env.CONTEXTFLOW_BACKEND_DIR
  ?? resolve(process.cwd(), '..', 'backend')

export const PYTHON = process.env.CONTEXTFLOW_PYTHON ?? 'python3'
