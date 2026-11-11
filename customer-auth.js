(function () {
'use strict';

const SUPABASE_URL =
'https://dnmktpmvjzsxzmgizdcv.supabase.co';

const SUPABASE_KEY =
'sb_publishable_80ZPvReXfDaw0UhD872X4Q_Vz2xcrbj';

const RETURN_KEY = 'tesla_pending_customer_action';

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const currentPage =
    location.pathname.split('/').pop() || 'index.html';


// ------------------------------------
// SAFE RETURN DESTINATION
// ------------------------------------

function safePath(path) {

    try {

        const url = new URL(path, location.origin);

        if (url.origin !== location.origin) {
            return 'index.html';
        }

        return url.pathname + url.search + url.hash;

    } catch (_) {

        return 'index.html';

    }

}


function redirectToLogin(destination) {

    const path = safePath(destination);

    localStorage.setItem(RETURN_KEY, path);

    location.href =
        'customer.html?returnTo=' +
        encodeURIComponent(path);

}


// ------------------------------------
// CHECK CUSTOMER LOGIN
// ------------------------------------

async function getCustomer() {

    const { data, error } = await db.auth.getUser();

    if (error) return null;

    return data.user || null;

}


// ------------------------------------
// RESTORE REQUEST AFTER LOGIN
// ------------------------------------

async function restoreRequest() {

    if (currentPage !== 'customer.html') return;

    const user = await getCustomer();

    if (!user) return;

    const saved =
        localStorage.getItem(RETURN_KEY);

    if (!saved) return;

    localStorage.removeItem(RETURN_KEY);

    location.replace(safePath(saved));

}


// Save return destination when opening Customer Portal.

if (currentPage === 'customer.html') {

    const requested =
        new URLSearchParams(location.search).get('returnTo');

    if (requested) {

        localStorage.setItem(
            RETURN_KEY,
            safePath(requested)
        );

    }

}


// Watch for successful login or registration.

db.auth.onAuthStateChange(function (event) {

    if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED'
    ) {

        setTimeout(restoreRequest, 500);

    }

});


// ------------------------------------
// PROTECT PURCHASE PAGE
// ------------------------------------

async function protectPurchasePage() {

    if (currentPage !== 'purchase.html') return;

    document.documentElement.style.visibility = 'hidden';

    const user = await getCustomer();

    if (!user) {

        redirectToLogin(
            location.pathname +
            location.search +
            location.hash
        );

        return;

    }

    document.documentElement.style.visibility = 'visible';

}

protectPurchasePage();


// ------------------------------------
// PROTECT HOMEPAGE ACTIONS
// ------------------------------------

document.addEventListener('click', async function (event) {

    const button = event.target.closest(
        'button[data-action], ' +
        '#liveChatLauncher, ' +
        '#chatLauncher'
    );

    const link = event.target.closest(
        'a[href="#negotiation"], ' +
        'a[href="#order"]'
    );

    const target = button || link;

    if (!target) return;

    let destination = null;

    if (button && button.dataset.action === 'order') {

        destination =
            'purchase.html?vehicle=' +
            encodeURIComponent(button.dataset.id);

    }

    else if (
        button &&
        button.dataset.action === 'negotiate'
    ) {

        destination =
            'index.html?auth_vehicle=' +
            encodeURIComponent(button.dataset.id) +
            '#negotiation';

    }

    else if (
        button &&
        (
            button.id === 'liveChatLauncher' ||
            button.id === 'chatLauncher'
        )
    ) {

        destination = 'index.html#livechat';

    }

    else if (link) {

        destination =
            'index.html' + link.getAttribute('href');

    }

    if (!destination) return;

    const user = await getCustomer();

    if (!user) {

        event.preventDefault();
        event.stopImmediatePropagation();

        redirectToLogin(destination);

    }

}, true);


// ------------------------------------
// PROTECT CUSTOMER FORMS
// ------------------------------------

document.addEventListener('submit', async function (event) {

    const form = event.target;

    const protectedForms = [

        'negotiationForm',
        'orderForm',
        'purchaseForm',
        'liveChatStartForm',
        'chatStartForm',
        'liveChatMessageForm',
        'chatMessageForm'

    ];

    if (!protectedForms.includes(form.id)) return;

    const user = await getCustomer();

    if (!user) {

        event.preventDefault();
        event.stopImmediatePropagation();

        redirectToLogin(
            location.pathname +
            location.search +
            location.hash
        );

    }

}, true);


// ------------------------------------
// RESTORE NEGOTIATION VEHICLE
// ------------------------------------

async function restoreNegotiation() {

    if (currentPage !== 'index.html') return;

    const params = new URLSearchParams(location.search);

    const vehicleId = params.get('auth_vehicle');

    if (!vehicleId) return;

    const user = await getCustomer();

    if (!user) return;

    params.delete('auth_vehicle');

    const cleanUrl =
        location.pathname +
        (params.toString() ? '?' + params.toString() : '') +
        location.hash;

    history.replaceState({}, '', cleanUrl);

    if (typeof window.negotiate === 'function') {

        window.negotiate(vehicleId);

    } else {

        const select = document.getElementById('negModel');

        if (select) select.value = vehicleId;

        document.getElementById('negotiation')
            ?.scrollIntoView({ behavior: 'smooth' });

    }

}


// ------------------------------------
// RESTORE LIVE CHAT
// ------------------------------------

async function restoreLiveChat() {

    if (currentPage !== 'index.html') return;

    if (location.hash !== '#livechat') return;

    const user = await getCustomer();

    if (!user) return;

    document.getElementById('liveChatLauncher')?.click();

}


window.addEventListener('load', function () {

    restoreNegotiation();

    restoreLiveChat();

});

})();
