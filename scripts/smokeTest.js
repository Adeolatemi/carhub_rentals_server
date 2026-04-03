const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API = 'http://localhost:5000';

async function postJson(pathUrl, body) {
  const res = await fetch(API + pathUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const txt = await res.text();
  let data;
  try { data = JSON.parse(txt); } catch (e) { data = txt; }
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await postJson('/auth/login', { email, password });
  return r;
}

async function uploadKyc(token, filePath) {
  const form = new (require('form-data'))();
  form.append('document', fs.createReadStream(filePath));
  const res = await fetch(API + '/users/me/kyc', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('Registering users...');
  console.log(await postJson('/auth/register', { email: 'user1@example.com', password: 'password1', name: 'User One' }));
  console.log(await postJson('/auth/register', { email: 'user2@example.com', password: 'password2', name: 'User Two' }));

  console.log('Promoting user2 to SUPERADMIN via Prisma');
  const user2 = await prisma.user.findUnique({ where: { email: 'user2@example.com' } });
  if (!user2) { console.error('user2 not found'); process.exit(1); }
  await prisma.user.update({ where: { email: 'user2@example.com' }, data: { role: 'SUPERADMIN', isActive: true } });
  console.log('Promoted user2');

  console.log('Logging in as user1 and user2');
  const l1 = await login('user1@example.com', 'password1');
  const l2 = await login('user2@example.com', 'password2');
  console.log('user1 login:', l1.status, l1.data);
  console.log('user2 login:', l2.status, l2.data);

  const user1Token = l1.data.token;
  const user2Token = l2.data.token;

  console.log('Uploading KYC for user1');
  const up = await uploadKyc(user1Token, path.join(__dirname, '..', 'tmp', 'testdoc.txt'));
  console.log('KYC upload result:', up.status, up.data);

  console.log('Listing users (admin)');
  const usersRes = await fetch(API + '/users', { headers: { Authorization: `Bearer ${user2Token}` } });
  console.log('users status', usersRes.status);
  console.log(await usersRes.text());

  console.log('Listing orders (admin)');
  const ordersRes = await fetch(API + '/orders', { headers: { Authorization: `Bearer ${user2Token}` } });
  console.log('orders status', ordersRes.status);
  console.log(await ordersRes.text());

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
