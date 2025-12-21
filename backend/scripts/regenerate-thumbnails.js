/**
 * Utility script to regenerate thumbnails for documents missing them
 * Usage: node scripts/regenerate-thumbnails.js [--all | --missing]
 */

require('dotenv').config();
const { query } = require('../src/config/database');
const { generateThumbnailInternal, generatePreviewInternal } = require('../src/controllers/previewController');

const regenerateThumbnails = async (mode = 'missing') => {
  try {
    console.log('\n🔧 Thumbnail Regeneration Script');
    console.log('================================\n');

    let whereClause = '';
    if (mode === 'missing') {
      whereClause = "WHERE thumbnail_url IS NULL AND status = 'approved'";
      console.log('📋 Mode: Regenerate MISSING thumbnails only\n');
    } else {
      whereClause = "WHERE status = 'approved'";
      console.log('📋 Mode: Regenerate ALL thumbnails\n');
    }

    const result = await query(
      `SELECT document_id, title, file_type FROM documents ${whereClause} ORDER BY created_at DESC`
    );

    const documents = result.rows;
    console.log(`📊 Found ${documents.length} document(s) to process\n`);

    if (documents.length === 0) {
      console.log('✅ No documents need thumbnail regeneration!');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const progress = `[${i + 1}/${documents.length}]`;
      
      console.log(`\n${progress} Processing: ${doc.title} (ID: ${doc.document_id}, Type: ${doc.file_type})`);
      console.log('─'.repeat(80));

      try {
        // Generate both preview and thumbnail
        const [previewResult, thumbResult] = await Promise.all([
          generatePreviewInternal(doc.document_id),
          generateThumbnailInternal(doc.document_id)
        ]);

        if (thumbResult.success) {
          console.log(`${progress} ✅ Thumbnail: ${thumbResult.thumbnailUrl}`);
          successCount++;
        } else {
          console.error(`${progress} ❌ Thumbnail FAILED: ${thumbResult.error}`);
          failCount++;
          failed.push({ id: doc.document_id, title: doc.title, error: thumbResult.error });
        }

        if (previewResult.success) {
          console.log(`${progress} ✅ Preview: ${previewResult.previewUrl}`);
        } else {
          console.error(`${progress} ⚠️ Preview failed: ${previewResult.error}`);
        }

        // Small delay to avoid overwhelming the system
        if (i < documents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`${progress} ❌ Exception: ${error.message}`);
        failCount++;
        failed.push({ id: doc.document_id, title: doc.title, error: error.message });
      }
    }

    console.log('\n\n📊 SUMMARY');
    console.log('================================');
    console.log(`✅ Success: ${successCount}/${documents.length}`);
    console.log(`❌ Failed:  ${failCount}/${documents.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Documents:');
      failed.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ID: ${f.id}, Title: "${f.title}"`);
        console.log(`     Error: ${f.error}`);
      });
    }

    console.log('\n✨ Regeneration complete!\n');
    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args.includes('--all') ? 'all' : 'missing';

regenerateThumbnails(mode);
