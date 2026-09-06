#!/usr/bin/env node
/**
 * Pushes store/asc/listing.json + store/screenshots/ios-6.9 to App Store Connect via the API.
 *   ASC_ISSUER_ID=… ASC_KEY_ID=… ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_X.p8 node store/asc/push-listing.mjs [--dry] [--no-screenshots] [--replace-screenshots]
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { SignJWT, importPKCS8 } from 'jose';

const ROOT = new URL('../..', import.meta.url).pathname;
const listing = JSON.parse(readFileSync(join(ROOT, 'store/asc/listing.json'), 'utf8'));
const SHOTS = join(ROOT, 'store/screenshots/ios-6.9');
const DRY = process.argv.includes('--dry');
const NO_SHOTS = process.argv.includes('--no-screenshots');
/** Screenshots are matched by file name, so a renamed set would pile up beside the old one. */
const REPLACE_SHOTS = process.argv.includes('--replace-screenshots');
const { ASC_ISSUER_ID, ASC_KEY_ID } = process.env;
const KEY_PATH = (process.env.ASC_KEY_PATH ?? `~/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8`).replace('~', process.env.HOME);
if (!ASC_ISSUER_ID || !ASC_KEY_ID) throw new Error('ASC_ISSUER_ID and ASC_KEY_ID are required');

const API = 'https://api.appstoreconnect.apple.com/v1';
let token = '';
async function jwt() {
  const key = await importPKCS8(readFileSync(KEY_PATH, 'utf8'), 'ES256');
  return new SignJWT({ aud: 'appstoreconnect-v1' }).setProtectedHeader({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' }).setIssuer(ASC_ISSUER_ID).setIssuedAt().setExpirationTime('15m').sign(key);
}
async function api(method, path, body) {
  const url = path.startsWith('http') ? path : API + path;
  if (DRY && method !== 'GET') { console.log(`  [dry] ${method} ${path}`, body ? JSON.stringify(body).slice(0, 160) : ''); return { data: { id: 'dry', attributes: {} } }; }
  const res = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 600)}`);
  return json;
}
const attrs = (type, attributes, relationships) => ({ data: { type, attributes, ...(relationships ? { relationships } : {}) } });
const rel = (type, id) => ({ data: { type, id } });

token = await jwt();

// 1. app
const apps = await api('GET', `/apps?filter[bundleId]=${listing.bundleId}`);
const app = apps.data[0];
if (!app) throw new Error(`No app record for ${listing.bundleId} yet — upload a build or create the app in App Store Connect first.`);
console.log(`App ${app.attributes.name} (${app.id}), primaryLocale=${app.attributes.primaryLocale}`);
if (app.attributes.primaryLocale !== listing.primaryLocale) {
  await api('PATCH', `/apps/${app.id}`, { data: { type: 'apps', id: app.id, attributes: { primaryLocale: listing.primaryLocale } } });
  console.log(`  primaryLocale → ${listing.primaryLocale}`);
}

// 2. appInfo: categories + localizations (name, subtitle, privacy URL)
const infos = await api('GET', `/apps/${app.id}/appInfos`);
const info = infos.data.find((i) => i.attributes.state !== 'READY_FOR_DISTRIBUTION' && i.attributes.appStoreState !== 'READY_FOR_SALE') ?? infos.data[0];
console.log(`AppInfo ${info.id} state=${info.attributes.state ?? info.attributes.appStoreState}`);
await api('PATCH', `/appInfos/${info.id}`, { data: { type: 'appInfos', id: info.id, relationships: { primaryCategory: rel('appCategories', listing.categories.primary), secondaryCategory: rel('appCategories', listing.categories.secondary) } } });
console.log('  categories set');
const infoLocs = (await api('GET', `/appInfos/${info.id}/appInfoLocalizations`)).data;
for (const [locale, l] of Object.entries(listing.locales)) {
  const a = { name: l.name, subtitle: l.subtitle, privacyPolicyUrl: listing.urls.privacy };
  const existing = infoLocs.find((x) => x.attributes.locale === locale);
  if (existing) await api('PATCH', `/appInfoLocalizations/${existing.id}`, { data: { type: 'appInfoLocalizations', id: existing.id, attributes: a } });
  else await api('POST', '/appInfoLocalizations', attrs('appInfoLocalizations', { locale, ...a }, { appInfo: rel('appInfos', info.id) }));
  console.log(`  appInfoLocalization ${locale} ${existing ? 'updated' : 'created'}`);
}
// age rating: nothing objectionable
try {
  const ar = await api('GET', `/appInfos/${info.id}/ageRatingDeclaration`);
  if (ar?.data) {
    const none = {};
    for (const k of ['alcoholTobaccoOrDrugUseOrReferences', 'contests', 'gamblingSimulated', 'horrorOrFearThemes', 'matureOrSuggestiveThemes', 'medicalOrTreatmentInformation', 'profanityOrCrudeHumor', 'sexualContentGraphicAndNudity', 'sexualContentOrNudity', 'violenceCartoonOrFantasy', 'violenceRealistic', 'violenceRealisticProlongedGraphicOrSadistic']) none[k] = 'NONE';
    await api('PATCH', `/ageRatingDeclarations/${ar.data.id}`, { data: { type: 'ageRatingDeclarations', id: ar.data.id, attributes: { ...none, gambling: false, unrestrictedWebAccess: false, seventeenPlus: false } } });
    console.log('  age rating declaration: none / 4+');
  }
} catch (e) { console.log('  age rating skipped:', e.message.slice(0, 200)); }

// 3. version + localizations
let versions = (await api('GET', `/apps/${app.id}/appStoreVersions?filter[platform]=IOS`)).data;
let version = versions.find((v) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'WAITING_FOR_REVIEW'].includes(v.attributes.appStoreState));
if (!version) {
  version = (await api('POST', '/appStoreVersions', attrs('appStoreVersions', { platform: 'IOS', versionString: '1.0.0' }, { app: rel('apps', app.id) }))).data;
  console.log(`Version created ${version.id}`);
} else console.log(`Version ${version.attributes.versionString} (${version.id}) state=${version.attributes.appStoreState}`);
const verLocs = (await api('GET', `/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
const locIds = {};
for (const [locale, l] of Object.entries(listing.locales)) {
  const a = { description: l.description, keywords: l.keywords, promotionalText: l.promotionalText, supportUrl: listing.urls.support, marketingUrl: listing.urls.marketing };
  const existing = verLocs.find((x) => x.attributes.locale === locale);
  let id;
  if (existing) { await api('PATCH', `/appStoreVersionLocalizations/${existing.id}`, { data: { type: 'appStoreVersionLocalizations', id: existing.id, attributes: a } }); id = existing.id; }
  else id = (await api('POST', '/appStoreVersionLocalizations', attrs('appStoreVersionLocalizations', { locale, ...a }, { appStoreVersion: rel('appStoreVersions', version.id) }))).data.id;
  locIds[locale] = id;
  console.log(`  versionLocalization ${locale} ${existing ? 'updated' : 'created'}`);
}

// 4. review details
{
  const rd = await api('GET', `/appStoreVersions/${version.id}/appStoreReviewDetail`).catch(() => null);
  const ra = { contactFirstName: listing.review.firstName, contactLastName: listing.review.lastName, contactEmail: listing.review.email, demoAccountRequired: false, notes: listing.review.notes, ...(listing.review.phone ? { contactPhone: listing.review.phone } : {}) };
  if (rd?.data) { await api('PATCH', `/appStoreReviewDetails/${rd.data.id}`, { data: { type: 'appStoreReviewDetails', id: rd.data.id, attributes: ra } }); console.log('  review details updated (notes' + (listing.review.phone ? ' + phone' : ', phone kept as is') + ')'); }
  else if (listing.review.phone) { await api('POST', '/appStoreReviewDetails', attrs('appStoreReviewDetails', ra, { appStoreVersion: rel('appStoreVersions', version.id) })); console.log('  review details created'); }
  else console.log('  review details skipped: no record yet and no phone in listing.json');
}

// 5. attach the latest processed build
const builds = (await api('GET', `/builds?filter[app]=${app.id}&filter[processingState]=VALID&sort=-uploadedDate&limit=1`)).data;
if (builds[0]) {
  await api('PATCH', `/appStoreVersions/${version.id}/relationships/build`, rel('builds', builds[0].id));
  console.log(`  build ${builds[0].attributes.version} attached`);
} else console.log('  no processed build yet — attach later (re-run the script)');

// 6. screenshots (6.9-inch set → APP_IPHONE_67 accepts 1320×2868)
if (!NO_SHOTS) {
  const files = readdirSync(SHOTS).filter((f) => f.endsWith('.png')).sort();
  for (const [locale, locId] of Object.entries(locIds)) {
    const sets = (await api('GET', `/appStoreVersionLocalizations/${locId}/appScreenshotSets`)).data;
    let set = sets.find((s) => s.attributes.screenshotDisplayType === 'APP_IPHONE_67');
    if (!set) set = (await api('POST', '/appScreenshotSets', attrs('appScreenshotSets', { screenshotDisplayType: 'APP_IPHONE_67' }, { appStoreVersionLocalization: rel('appStoreVersionLocalizations', locId) }))).data;
    const existing = DRY ? [] : (await api('GET', `/appScreenshotSets/${set.id}/appScreenshots`)).data;
    if (REPLACE_SHOTS) {
      for (const s of existing) {
        await api('DELETE', `/appScreenshots/${s.id}`);
        console.log(`  ${locale}: ${s.attributes.fileName} removed`);
      }
    }
    const have = new Set(REPLACE_SHOTS ? [] : existing.map((s) => s.attributes.fileName));
    for (const f of files) {
      if (have.has(f)) { console.log(`  ${locale}: ${f} already uploaded`); continue; }
      const buf = readFileSync(join(SHOTS, f));
      const shot = (await api('POST', '/appScreenshots', attrs('appScreenshots', { fileName: f, fileSize: buf.length }, { appScreenshotSet: rel('appScreenshotSets', set.id) }))).data;
      if (DRY) continue;
      for (const op of shot.attributes.uploadOperations) {
        const chunk = buf.subarray(op.offset, op.offset + op.length);
        const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
        const r = await fetch(op.url, { method: op.method, headers, body: chunk });
        if (!r.ok) throw new Error(`upload chunk failed ${r.status}`);
      }
      await api('PATCH', `/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(buf).digest('hex') } } });
      console.log(`  ${locale}: ${basename(f)} uploaded`);
    }
  }
}
console.log(DRY ? 'dry run complete' : 'done');
