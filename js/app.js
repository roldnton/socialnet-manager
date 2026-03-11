// js/app.js
// ================================================================
// Section 1: Supabase Client Initialization
// ================================================================

const { createClient } = supabase
const SUPABASE_URL = 'https://eyednnaboqxumjnyunwo.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FsWhV2NutYbt88vfQjukqQ_wXgXMAXe'
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

// ================================================================
// Section 2: Application State
// ================================================================

let currentProfileId = null

// ================================================================
// Section 3: Helper Functions
// ================================================================

function setStatus(message, isError = false) {
    const bar = document.getElementById('status-message')
    const footer = document.getElementById('status-bar')
    bar.textContent = message
    footer.style.background = isError ? '#6b1a1a' : 'var(--clr-status-bg)'
    footer.style.color = isError ? '#ffcccc' : 'var(--clr-status-text)'
}

function clearCentrePanel() {
    document.getElementById('profile-pic').src = 'resources/images/default.png'
    document.getElementById('profile-name').textContent = 'No Profile Selected'
    document.getElementById('profile-status').textContent = '--'
    document.getElementById('profile-quote').textContent = '--'
    document.getElementById('friends-list').innerHTML = ''
    currentProfileId = null
}

function displayProfile(profile, friends = []) {
    document.getElementById('profile-pic').src = profile.picture || 'resources/images/default.png'
    document.getElementById('profile-name').textContent = profile.name
    document.getElementById('profile-status').textContent = profile.status || '(no status)'
    document.getElementById('profile-quote').textContent = profile.quote || '(no quote)'
    currentProfileId = profile.id
    renderFriendsList(friends)
    setStatus(`Displaying ${profile.name}.`)
}

function renderFriendsList(friends) {
    const list = document.getElementById('friends-list')
    list.innerHTML = ''
    
    if (friends.length === 0) {
        list.innerHTML = '<p class="empty-state">No friends yet.</p>'
        return
    }
    
    friends.forEach(f => {
        const div = document.createElement('div')
        div.className = 'friend-entry'
        div.textContent = f.name 
        list.appendChild(div) // FIXED: Changed 'box' to 'list'
    })
}

// ================================================================
// Section 4: CRUD Functions
// ================================================================

async function loadProfileList() {
    try {
        const { data, error } = await db
            .from('profiles')
            .select('id, name')
            .order('name', { ascending: true })

        if (error) throw error

        const container = document.getElementById('profile-list')
        container.innerHTML = ''

        if (data.length === 0) {
            container.innerHTML = '<p class="text-muted small fst-italic p-2">No profiles found.</p>'
            return
        }

        data.forEach(profile => {
            const row = document.createElement('div')
            row.className = 'profile-item'
            row.dataset.id = profile.id
            row.textContent = profile.name // FIXED: Assigning text directly to the row
            row.addEventListener('click', () => selectProfile(profile.id)) // FIXED: Attach listener directly to row
            container.appendChild(row)
        })
    } catch (err) {
        setStatus(`Error loading profiles: ${err.message}`, true)
    }
}

async function selectProfile(profileId) {
    try {
        document.querySelectorAll('#profile-list .profile-item')
            .forEach(el => {
                el.classList.toggle('active', el.dataset.id === profileId)
            })

        const { data: profile, error: profileError } = await db
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single()

        if (profileError) throw profileError

        const { data: friendConnections, error: friendsError } = await db
            .from('friends')
            .select('profile_id, friend_id')
            .or(`profile_id.eq.${profileId},friend_id.eq.${profileId}`)

        if (friendsError) throw friendsError
        
        const friendIds = friendConnections.map(f => 
            f.profile_id === profileId ? f.friend_id : f.profile_id
        )

        let friendProfiles = []
        if (friendIds.length > 0) {
            const { data: namesData, error: namesError } = await db
                .from('profiles')
                .select('name')
                .in('id', friendIds)
                
            if (namesError) throw namesError
            friendProfiles = namesData
        }
        
        displayProfile(profile, friendProfiles)
        
    } catch (err) {
        setStatus(`Error selecting profile: ${err.message}`, true)
    }
}

async function addProfile() {
    const nameInput = document.getElementById('input-name')
    const name = nameInput.value.trim()

    if (!name) {
        setStatus('Error: Name field is empty. Please enter a name.', true)
        return
    }

    try {
        const { data, error } = await db
            .from('profiles')
            .insert({ name })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                setStatus(`Error: A profile named "${name}" already exists.`, true)
            } else {
                throw error
            }
            return
        }

        nameInput.value = ''
        await loadProfileList()
        await selectProfile(data.id)
        setStatus(`Profile "${name}" created successfully.`)

    } catch (err) {
        setStatus(`Error adding profile: ${err.message}`, true)
    }
}

async function lookUpProfile() {
    const query = document.getElementById('input-lookup').value.trim() // FIXED: ID updated

    if (!query) {
        setStatus('Error: Search field is empty. Please enter a name to search.', true)
        return
    }

    try {
        const { data, error } = await db
            .from('profiles')
            .select('id, name')
            .ilike('name', `%${query}%`)
            .order('name', { ascending: true })
            .limit(1)

        if (error) throw error

        if (data.length === 0) {
            setStatus(`No profile found matching "${query}".`, true)
            clearCentrePanel()
            return
        }

        await selectProfile(data[0].id)
    } catch (err) {
        setStatus(`Error looking up profile: ${err.message}`, true)
    }
}

async function deleteProfile() {
    if (!currentProfileId) {
        setStatus('Error: No profile is selected. Click a profile in the list first.', true)
        return
    }

    const name = document.getElementById('profile-name').textContent

    if (!window.confirm(`Delete the profile for "${name}"? This cannot be undone.`)) {
        setStatus('Deletion cancelled.')
        return
    }

    try {
        const { error } = await db
            .from('profiles')
            .delete()
            .eq('id', currentProfileId)

        if (error) throw error

        clearCentrePanel()
        await loadProfileList()
        setStatus(`Profile "${name}" deleted. Friend relationships removed automatically.`)

    } catch (err) {
        setStatus(`Error deleting profile: ${err.message}`, true)
    }
}

async function changeStatus() {
    if (!currentProfileId) {
        setStatus('Error: No profile is selected.', true)
        return
    }
    const newStatus = document.getElementById('input-status').value.trim()
    if (!newStatus) {
        setStatus('Error: Status field is empty.', true)
        return
    }
    try {
        const { error } = await db
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', currentProfileId)

        if (error) throw error

        document.getElementById('profile-status').textContent = newStatus
        document.getElementById('input-status').value = ''
        setStatus('Status updated.')

    } catch (err) {
        setStatus(`Error updating status: ${err.message}`, true)
    }
}

async function changePicture() {
    if (!currentProfileId) {
        setStatus("Please select a profile first.", true);
        return;
    }

    const pictureInput = document.getElementById('input-picture');
    const newPictureUrl = pictureInput.value.trim();

    if (!newPictureUrl) {
        setStatus("Please enter a valid image URL or path.", true);
        return;
    }

    try {
        const { error } = await db
            .from('profiles')
            .update({ picture: newPictureUrl })
            .eq('id', currentProfileId);

        if (error) throw error;

        document.getElementById('profile-pic').src = newPictureUrl;
        
        pictureInput.value = ''; 
        setStatus("Profile picture updated successfully!");
        
    } catch (err) {
        setStatus(`Error updating picture: ${err.message}`, true);
    }
}

async function changeQuote() {
    if (!currentProfileId) {
        setStatus("Please select a profile first.", true);
        return;
    }

    const quoteInput = document.getElementById('input-quote');
    const newQuote = quoteInput.value.trim();

    if (!newQuote) {
        setStatus("Please enter a quote.", true);
        return;
    }

    try {
        const { error } = await db
            .from('profiles')
            .update({ quote: newQuote })
            .eq('id', currentProfileId);

        if (error) throw error;

        // Update the UI in the center panel instantly
        document.getElementById('profile-quote').innerHTML = `<em>"${newQuote}"</em>`;
        quoteInput.value = ''; // Clear the input box
        setStatus("Quote updated successfully.");
        
    } catch (err) {
        setStatus(`Error updating quote: ${err.message}`, true);
    }
}

// ================================================================
// Section 5: Friends Management
// ================================================================

async function addFriend() {
    if (!currentProfileId) {
        setStatus("Please select a profile first.", true);
        return;
    }

    const friendInput = document.getElementById('input-friend');
    const friendName = friendInput.value.trim();

    if (!friendName) {
        setStatus("Please enter a friend's name.", true);
        return;
    }

    try {
        const { data: targetProfile, error: lookupError } = await db
            .from('profiles')
            .select('id, name')
            .ilike('name', friendName)
            .single();

        if (lookupError) {
            if (lookupError.code === 'PGRST116') {
                setStatus(`Could not find a profile named "${friendName}".`, true);
                return;
            }
            throw lookupError;
        }

        const targetFriendId = targetProfile.id;

        if (targetFriendId === currentProfileId) {
            setStatus("You cannot add yourself as a friend.", true);
            return;
        }

        const { error: insertError } = await db
            .from('friends')
            .insert([
                { profile_id: currentProfileId, friend_id: targetFriendId }
            ]);

        if (insertError) {
            if (insertError.code === '23505') {
                setStatus(`${targetProfile.name} is already on your friends list.`, true);
                return;
            }
            throw insertError;
        }

        friendInput.value = '';
        setStatus(`Successfully added ${targetProfile.name} as a friend!`);
        
        selectProfile(currentProfileId); 

    } catch (err) {
        setStatus(`Error adding friend: ${err.message}`, true);
    }
}

async function removeFriend() {
    if (!currentProfileId) {
        setStatus('Error: No profile is selected.', true)
        return
    }
    const friendName = document.getElementById('input-remove-friend').value.trim() // FIXED: Updated ID
    if (!friendName) {
        setStatus('Error: Friend name field is empty.', true)
        return
    }
    try {
        const { data: found, error: findError } = await db
            .from('profiles')
            .select('id, name')
            .ilike('name', friendName)
            .limit(1)

        if (findError) throw findError

        if (found.length === 0) {
            setStatus(`Error: No profile named "${friendName}" exists.`, true)
            return
        }

        const friendId = found[0].id

        const { error: deleteError } = await db
            .from('friends')
            .delete()
            .eq('profile_id', currentProfileId)
            .eq('friend_id', friendId)

        if (deleteError) throw deleteError

        document.getElementById('input-remove-friend').value = '' // FIXED: Updated ID
        await selectProfile(currentProfileId)
        setStatus(`"${found[0].name}" removed from friends list.`)

    } catch (err) {
        setStatus(`Error removing friend: ${err.message}`, true)
    }
}

// ================================================================
// Section 6: Event Listener Setup
// ================================================================

document.addEventListener('DOMContentLoaded', async () => {

    // ── Left panel buttons ─────────────────────────────────────────
    document.getElementById('btn-add').addEventListener('click', addProfile)
    document.getElementById('btn-delete').addEventListener('click', deleteProfile)

    // ── Right panel buttons ────────────────────────────────────────
    document.getElementById('btn-status').addEventListener('click', changeStatus)
    document.getElementById('btn-picture').addEventListener('click', changePicture)
    document.getElementById('btn-add-friend').addEventListener('click', addFriend);
    document.getElementById('btn-remove-friend').addEventListener('click', removeFriend)
    document.getElementById('btn-quote').addEventListener('click', changeQuote);

    // ── Enter key shortcuts ────────────────────────────────────────
    document.getElementById('input-name').addEventListener('keydown', e => { 
        if (e.key === 'Enter') addProfile()
    })

    document.getElementById('input-lookup').addEventListener('keydown', e => { 
        if (e.key === 'Enter') lookUpProfile() 
    })

    document.getElementById('input-status').addEventListener('keydown', e => { 
        if (e.key === 'Enter') changeStatus()
    })

    // ── Initial data load ──────────────────────────────────────────
    await loadProfileList()
    setStatus('Ready. Select a profile from the list or add a new one.')

    // ── Live Search / Filter Profiles ──────────────────────────────
    document.getElementById('input-lookup').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim()
        const profileItems = document.querySelectorAll('#profile-list .profile-item')
        
        profileItems.forEach(item => {
            const name = item.textContent.toLowerCase()
            if (name.includes(searchTerm)) {
                item.style.display = ''
            } else {
                item.style.display = 'none'
            }
        })
    })

    document.getElementById('input-lookup').addEventListener('keydown', e => { 
        if (e.key === 'Enter') {
            const firstVisibleProfile = document.querySelector('#profile-list .profile-item:not([style*="display: none"])')
            if (firstVisibleProfile) {
                firstVisibleProfile.click()
            } else {
                setStatus('No matching profiles found to select.', true)
            }
        }
    })
})