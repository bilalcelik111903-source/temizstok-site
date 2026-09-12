<?php
/**
 * TemizStok – iletişim ve teklif formu işleyicisi.
 * Alıcı adresi api/config.php dosyasındadır (site.config.json > contactTo alanından üretilir).
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(bool $ok, string $message, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(false, 'Geçersiz istek.', 405);

$cfg = @include __DIR__ . '/config.php';
if (!is_array($cfg) || empty($cfg['to'])) respond(false, 'Form yapılandırılmamış.', 500);

$clean = static fn(string $k, int $max = 500): string => mb_substr(trim(strip_tags((string)($_POST[$k] ?? ''))), 0, $max);

// Honeypot: gerçek kullanıcılar bu alanı görmez
if ($clean('website') !== '') respond(true, 'Mesajınız alındı.');

$type    = $clean('type', 20) === 'quote' ? 'quote' : 'contact';
$name    = $clean('name', 120);
$email   = $clean('email', 160);
$phone   = $clean('phone', 40);
$company = $clean('company', 160);
$sector  = $clean('sector', 80);
$city    = $clean('city', 80);
$subject = $clean('subject', 120);
$message = mb_substr(trim((string)($_POST['message'] ?? '')), 0, 4000);

if ($name === '' || $message === '') respond(false, 'Lütfen ad soyad ve mesaj alanlarını doldurun.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Lütfen geçerli bir e-posta adresi girin.', 422);
if ($type === 'quote' && $company === '') respond(false, 'Lütfen firma adını girin.', 422);

$site = $cfg['site'] ?? 'TemizStok';
$title = $type === 'quote' ? "[$site] Toptan teklif talebi – $company" : "[$site] İletişim formu – " . ($subject !== '' ? $subject : $name);
$lines = [
    'Tür: ' . ($type === 'quote' ? 'Toptan / kurumsal teklif' : 'İletişim'),
    'Ad Soyad: ' . $name,
    'E-posta: ' . $email,
    'Telefon: ' . $phone,
];
if ($type === 'quote') { $lines[] = 'Firma: ' . $company; $lines[] = 'Sektör: ' . $sector; $lines[] = 'Şehir: ' . $city; }
else { $lines[] = 'Konu: ' . $subject; }
$lines[] = 'Tarih: ' . date('d.m.Y H:i');
$lines[] = 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
$lines[] = '';
$lines[] = 'Mesaj:';
$lines[] = $message;
$body = implode("\n", $lines);

$from = $cfg['from'] ?? 'no-reply@localhost';
$headers = [
    'From: ' . $site . ' <' . $from . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
];
$encodedTitle = '=?UTF-8?B?' . base64_encode($title) . '?=';
$sent = @mail($cfg['to'], $encodedTitle, $body, implode("\r\n", $headers));

// Yedek: mesajı public_html dışındaki bir günlük dosyasına da yaz
$logDir = dirname(__DIR__, 2);
@file_put_contents($logDir . '/form-mesajlari.log', "==== $title ====\n$body\n\n", FILE_APPEND | LOCK_EX);

if (!$sent) respond(false, 'E-posta gönderilemedi. Lütfen telefon veya WhatsApp ile ulaşın.', 500);
respond(true, $type === 'quote' ? 'Teklif talebiniz alındı. 1 iş günü içinde size dönüş yapacağız.' : 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.');
