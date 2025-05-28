const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Chrome Extension Structure (Manifest V3)...\n');

// Check manifest.json
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  console.log('✅ manifest.json is valid JSON');
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Manifest Version: ${manifest.manifest_version}`);
  
  // Validate Manifest V3 compliance
  if (manifest.manifest_version === 3) {
    console.log('✅ Using Manifest V3 (future-proof!)');
    
    // Check for service worker instead of background page
    if (manifest.background && manifest.background.service_worker) {
      console.log('✅ Using service worker (MV3 compliant)');
    } else {
      console.log('⚠️  No service worker found - this may cause issues');
    }
    
    // Check for action instead of browser_action
    if (manifest.action) {
      console.log('✅ Using action API (MV3 compliant)');
    } else {
      console.log('⚠️  No action found - popup may not work');
    }
    
    // Check permissions
    if (manifest.permissions && !manifest.permissions.includes('tabs')) {
      console.log('✅ Not using deprecated "tabs" permission');
    }
    
    if (manifest.permissions && manifest.permissions.includes('activeTab')) {
      console.log('✅ Using "activeTab" permission (recommended)');
    }
    
  } else if (manifest.manifest_version === 2) {
    console.log('❌ Using deprecated Manifest V2 - this will stop working in 2025!');
    console.log('   Please migrate to Manifest V3: https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline');
  } else {
    console.log('❌ Unknown manifest version');
  }
  
} catch (error) {
  console.log('❌ manifest.json error:', error.message);
  process.exit(1);
}

// Check required files
const requiredFiles = [
  'background.js',
  'dist/index.html',
  'dist/main.js',
  'dist/contentScript.js',
  'dist/app.css',
  'img/icon16.png',
  'img/icon48.png',
  'img/icon128.png'
];

let allFilesExist = true;

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} is missing`);
    allFilesExist = false;
  }
});

// Check for Manifest V3 best practices
console.log('\n🔧 Manifest V3 Best Practices Check:');

try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  // Check minimum Chrome version
  if (manifest.minimum_chrome_version) {
    console.log(`✅ Minimum Chrome version specified: ${manifest.minimum_chrome_version}`);
  } else {
    console.log('⚠️  Consider adding minimum_chrome_version for better compatibility');
  }
  
  // Check icon format
  if (manifest.action && typeof manifest.action.default_icon === 'object') {
    console.log('✅ Using multiple icon sizes in action');
  } else {
    console.log('⚠️  Consider using multiple icon sizes for better display');
  }
  
  // Check service worker configuration
  if (manifest.background && manifest.background.service_worker) {
    console.log('✅ Service worker properly configured');
    
    // Check if service worker file exists
    if (fs.existsSync(manifest.background.service_worker)) {
      console.log('✅ Service worker file exists');
    } else {
      console.log('❌ Service worker file missing');
    }
  }
  
} catch (error) {
  console.log('❌ Error checking best practices:', error.message);
}

if (allFilesExist) {
  console.log('\n🎉 All required files are present!');
  console.log('\n📋 To load the extension in Chrome:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" (toggle in top right)');
  console.log('3. Click "Load unpacked"');
  console.log('4. Select this folder:', process.cwd());
  console.log('5. The extension should appear in your extensions list');
  
  console.log('\n🚀 Manifest V3 Benefits:');
  console.log('- Future-proof (MV2 deprecated in 2025)');
  console.log('- Better security with service workers');
  console.log('- Improved performance and reliability');
  console.log('- Enhanced privacy controls');
  
  console.log('\n🔧 If you get errors:');
  console.log('- Check the Chrome Developer Console for specific error messages');
  console.log('- Look at the extension details page for any warnings');
  console.log('- Ensure all permissions are granted');
  console.log('- Verify you\'re using Chrome 88+ (required for this extension)');
  console.log('- Check service worker status in chrome://extensions/ details');
} else {
  console.log('\n❌ Some files are missing. Please run "npm run build" first.');
  process.exit(1);
} 