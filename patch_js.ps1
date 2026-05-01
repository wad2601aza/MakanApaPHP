$file = 'c:\xampp\htdocs\makanapaPHP2\makanapa.js'
$content = Get-Content $file -Raw -Encoding UTF8

$oldFunc = @'
async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
        const msgs = {
'@

$newFunc = @'
async function updateOrderStatus(orderId, newStatus) {
    try {
        await API.updateOrderStatus(orderId, newStatus);
        const msgs = {
'@

# Only replace the first part we can match safely
$content = $content -replace [regex]::Escape("    const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {"), "    try {
        await API.updateOrderStatus(orderId, newStatus);"

# Replace the closing else block
$content = $content -replace [regex]::Escape("    } else {
        showToast('Update failed 😕', error.message, 'error');
    }
}

/* ── SUPABASE REALTIME"), "    } catch (err) {
        showToast('Update failed 😕', err.message, 'error');
    }
}

/* ── SUPABASE REALTIME"

Set-Content $file $content -Encoding UTF8
Write-Host "Done"
