#!/usr/bin/env node

/**
 * Build Validation Script
 * 
 * This script performs pre-build validation to ensure the project is in a valid state
 * before attempting to build. It checks package.json integrity, dependency availability,
 * and other critical build requirements.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = process.cwd();
  }

  log(message, type = 'info') {
    const prefix = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    }[type];
    console.log(`${prefix} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  /**
   * Validate package.json structure and required fields
   */
  validatePackageJson() {
    this.log('Validating package.json...');

    const packagePath = path.join(this.projectRoot, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      this.addError('package.json not found');
      return false;
    }

    try {
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check required fields
      const requiredFields = ['name', 'version', 'scripts'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          this.addError(`package.json missing required field: ${field}`);
        }
      }

      // Check required scripts
      const requiredScripts = ['build', 'dev'];
      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.addError(`package.json missing required script: ${script}`);
        }
      }

      // Check for critical dependencies
      const criticalDeps = ['react', 'react-dom'];
      for (const dep of criticalDeps) {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          this.addError(`Missing critical dependency: ${dep}`);
        }
      }

      // Check for critical dev dependencies
      const criticalDevDeps = ['vite', '@types/react'];
      for (const dep of criticalDevDeps) {
        if (!packageJson.devDependencies || !packageJson.devDependencies[dep]) {
          this.addError(`Missing critical dev dependency: ${dep}`);
        }
      }

      this.log('package.json validation passed', 'success');
      return true;
    } catch (error) {
      this.addError(`Invalid package.json: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if node_modules exists and dependencies are installed
   */
  validateNodeModules() {
    this.log('Validating node_modules...');

    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      this.addError('node_modules directory not found. Run "npm install" first.');
      return false;
    }

    // Check if package-lock.json exists
    const lockfilePath = path.join(this.projectRoot, 'package-lock.json');
    if (!fs.existsSync(lockfilePath)) {
      this.addWarning('package-lock.json not found. This may lead to inconsistent builds.');
    }

    this.log('node_modules validation passed', 'success');
    return true;
  }

  /**
   * Validate TypeScript configuration
   */
  validateTypeScript() {
    this.log('Validating TypeScript configuration...');

    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    
    if (!fs.existsSync(tsconfigPath)) {
      this.addError('tsconfig.json not found');
      return false;
    }

    try {
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
      // Remove comments for JSON parsing (simple approach)
      const cleanContent = tsconfigContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, ''); // Remove // comments
      JSON.parse(cleanContent);
      this.log('TypeScript configuration valid', 'success');
      return true;
    } catch (error) {
      this.addError(`Invalid tsconfig.json: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate Vite configuration
   */
  validateViteConfig() {
    this.log('Validating Vite configuration...');

    const viteConfigPath = path.join(this.projectRoot, 'vite.config.ts');
    
    if (!fs.existsSync(viteConfigPath)) {
      this.addWarning('vite.config.ts not found, using default configuration');
      return true;
    }

    this.log('Vite configuration found', 'success');
    return true;
  }

  /**
   * Check for critical files
   */
  validateCriticalFiles() {
    this.log('Validating critical files...');

    const criticalFiles = [
      'src/main.tsx',
      'src/App.tsx',
      'index.html'
    ];

    let allFilesExist = true;
    for (const file of criticalFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.addError(`Critical file missing: ${file}`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      this.log('All critical files present', 'success');
    }

    return allFilesExist;
  }

  /**
   * Validate public assets
   */
  validatePublicAssets() {
    this.log('Validating public assets...');

    const publicPath = path.join(this.projectRoot, 'public');
    
    if (!fs.existsSync(publicPath)) {
      this.addWarning('public directory not found');
      return true;
    }

    // Check for required data files
    const dataFiles = [
      'public/data/planets.min.json',
      'public/data/missions.json'
    ];

    for (const file of dataFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.addWarning(`Data file missing: ${file}`);
      }
    }

    this.log('Public assets validation completed', 'success');
    return true;
  }

  /**
   * Check Node.js version compatibility
   */
  validateNodeVersion() {
    this.log('Validating Node.js version...');

    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 16) {
      this.addError(`Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
      return false;
    }

    this.log(`Node.js version ${nodeVersion} is compatible`, 'success');
    return true;
  }

  /**
   * Perform dependency audit
   */
  async validateSecurity() {
    this.log('Running security audit...');

    try {
      execSync('npm audit --audit-level moderate', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      this.log('Security audit passed', 'success');
    } catch (error) {
      const output = error.stdout?.toString() || error.message;
      if (output.includes('vulnerabilities')) {
        this.addWarning('Security vulnerabilities found. Run "npm audit fix" to resolve.');
      } else {
        this.addWarning('Could not complete security audit');
      }
    }

    return true;
  }

  /**
   * Run all validations
   */
  async validate() {
    this.log('Starting build validation...', 'info');
    console.log('');

    const validations = [
      () => this.validateNodeVersion(),
      () => this.validatePackageJson(),
      () => this.validateNodeModules(),
      () => this.validateTypeScript(),
      () => this.validateViteConfig(),
      () => this.validateCriticalFiles(),
      () => this.validatePublicAssets(),
      () => this.validateSecurity()
    ];

    for (const validation of validations) {
      const result = await validation();
      if (!result && this.errors.length > 0) {
        // Stop on first critical error
        break;
      }
    }

    console.log('');
    
    if (this.errors.length > 0) {
      this.log(`Build validation failed with ${this.errors.length} error(s):`, 'error');
      this.errors.forEach(error => console.log(`  • ${error}`));
      console.log('');
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      this.log(`Build validation completed with ${this.warnings.length} warning(s):`, 'warning');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
      console.log('');
    }

    this.log('Build validation passed! Ready to build.', 'success');
    process.exit(0);
  }
}

// Run validation if this script is executed directly
const validator = new BuildValidator();
validator.validate().catch(error => {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
});