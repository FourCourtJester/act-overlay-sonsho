/**
 * SonshoDashboard
 * @class
 */
class SonshoDashboard {
    /**
     * @constructor
     */
    constructor () {
        this.socket = new WS()

        this.init()
        this.sockets()
        this.onLoad()

        return this
    }

    /**
     * Class initialization
     */
    init () {
        this.options = {
            YOU: 'YOU',
            LIMIT_BREAK: 'Limit Break',
            categories: ['encdps', 'enchps', 'enctps'],
            fractionals: ['encdps', 'enchps', 'enctps', 'damage', 'healing', 'damage_taken'],
        }

        // DOM Elements
        this.elements = {
            header: {
                prefix: `.encounter`,
            },
            btn: `button`,
            pane: '.tab-pane',
            entry: {
                combat: {
                    class: '.combat-entry',
                    prefix: `combat-entry`,
                    prefix_mustache: '#mustache-combat-entry',
                    dynamic: 'dynamic-field',
                    graph: '.bar-graph',
                    height: 30,
                },
            },
        }

        // Combat log
        this.combat = {
            active: null,
            title: 'No Encounter in Progress',
            combatants: [],
            time: {
                t: 0,
                formatted: '00:00',
            },
            totals: {
                rdps: 'N/A',
                rhps: 'N/A',
                rtps: 'N/A',
            },
            data: {},
        }

        this.history = []

        // Socket Events
        this.events = {
            onCombatData: this._onCombatData.bind(this),
        }

        this.update(this.combat)
    }

    /**
     * DOM Event Listeners
     * @return {Boolean}
     */
    listeners () {
        // Prevent reassigning duplicate listeners
        if (!this.socket.settings.first_connect) return false

        const that = this

        $(document)
            // OverlayPlugin
            .on('onOverlayStateUpdate', (e) => {
                $('body').removeClass('debug')

                if (e.detail.isLocked) $('body').removeClass('resize')
                else $('body').addClass('resize')
            })
            // Overlay Plugin
            .on('onOverlayDataUpdate', (e) => {
                if (!this.socket.ready) this._onCombatData(e.detail)
            })
            .on('click', this.elements.btn, function (e) {
                e.preventDefault()

                const
                    $this = $(this),
                    $target = $($this.data('target')),
                    $category = $([that.elements.header.prefix, 'category'].join('-'))

                $(that.elements.pane).removeClass('show active')
                $target.addClass('show active')

                $(that.elements.btn).removeClass('active')
                $this.addClass('active')

                $([that.elements.header.prefix, 'total'].join('-')).addClass('d-none').removeClass('d-inline-block')

                for (const total of Utils.getObjValue($this.data(), 'sonsho.totals') || []) {
                    $([that.elements.header.prefix, total].join('-')).toggleClass('d-none d-inline-block')
                }

                Utils.setElementValue($category, Utils.getObjValue($this.data(), 'sonsho.category'))
            })
    }

    /**
    * Socket Events
    */
    sockets () {
        // Connect
        this.socket.connect()

        this.socket.subscribe('CombatData', this.events.onCombatData)
    }

    /**
     * Window Load
     */
    onLoad () {
        this.listeners()
    }

    // Events

    /**
     * Updates the UI
     * @param {Object} combat
     */
    async update (combat) {
        // Welcome view is up, no data has been passed
        if ($('#view-welcome.show.active').length) {
            // If there is no actual combat data, this is probably a page load
            if (combat.active == null) {
                // Fill in default data
                Utils.setElementValue($([this.elements.header.prefix, 'time'].join('-')), combat.time.formatted)
                Utils.setElementValue($([this.elements.header.prefix, 'title'].join('-')), combat.title)
                Utils.setElementValue($([this.elements.header.prefix, 'category'].join('-')), 'Waiting')
                return
            }

            $(`${this.elements.btn}`).eq(0).trigger('click')
        }

        const saves = []

        // Create Combatant entries
        for (const combatant of combat.combatants) {
            saves.push(Promise.resolve(this._parse(combat, combatant)))
        }

        await Promise.all(saves)
            .then((entries) => {
                const max = {}

                // Save the max values
                for (const entry of entries) {
                    if (!entry) continue

                    for (const stat of this.options.fractionals) {
                        if (stat.startsWith('enc')) max[stat] = Math.max(entry[stat], max[stat] || 0)
                        else max[stat] = (max[stat] || 0) + entry[stat]
                    }
                }

                return [entries, max]
            })
            .then(([entries, max]) => {
                const sub_saves = []

                for (const entry of entries) {
                    if (!entry) continue

                    sub_saves.push(new Promise((resolve, reject) => {
                        for (const stat of Object.keys(max)) entry.fraction[stat] = (entry[stat] / max[stat]) * 100
                        this._entry(entry)
                        resolve(entry)
                    }))
                }

                return [Promise.resolve(Promise.all(sub_saves)), max]
            })
            .then(([, max]) => {
                // Update the header values
                Utils.setElementValue($([this.elements.header.prefix, 'time'].join('-')), combat.time.formatted)
                Utils.setElementValue($([this.elements.header.prefix, 'title'].join('-')), combat.title)
                Utils.setElementValue($([this.elements.header.prefix, 'rdps'].join('-')), this._format(max.damage / (combat.time.t || 1)))
                Utils.setElementValue($([this.elements.header.prefix, 'rhps'].join('-')), this._format(max.healing / (combat.time.t || 1)))
                Utils.setElementValue($([this.elements.header.prefix, 'rtps'].join('-')), this._format(max.damage_taken / (combat.time.t || 1)))

                for (const category of this.options.categories) {
                    const
                        $category = $(`.${category}`),
                        $entries = $category.children(),
                        $title = $category.prev('.title')

                    if (!$entries.length) {
                        $title.removeClass('d-flex').addClass('d-none')
                        continue
                    }

                    $title.removeClass('d-none').addClass('d-flex')

                    this._sort($entries)
                }
            })
    }

    /**
     * Parses the ACT information
     * @param {Object} combat
     * @param {Object} combatant
     * @return {Object|null}
     */
    async _parse (combat, combatant) {
        const entry = { fraction: {} }

        // Identification
        entry.job = combatant.Job.length ? combatant.Job.toUpperCase() : Utils.in(combatant.name, '(') ? '-pet' : '-limit-break'

        // Remove Monster entries
        if (entry.job == '-limit-break' && combatant.display_name !== this.options.LIMIT_BREAK) return null

        entry.display_name = combatant.name
        entry.display_name_short = Utils.slugify(combatant.name)
        entry.you = combatant.name == this.options.YOU,

        // Stats - Damage
        entry.damage = +combatant.damage

        // Stats - Healing
        // entry.overhealing = +combatant.overHeal  // ACTWebsocket
        // entry.healing = +combatant.healed - entry.overhealing - entry.shielding  // ACTWebsocket
        // entry.fraction.overhealing = (entry.overhealing / (+combatant.healed || 1)) * 100    // ACTWebsocket

        entry.shielding = +combatant.damageShield
        entry.fraction.overhealing = combatant.OverHealPct ? +(combatant.OverHealPct.slice(0, -1)) : 0
        entry.overhealing = +combatant.healed * (entry.fraction.overhealing / 100)
        entry.healing = Math.max(0, +combatant.healed - entry.overhealing - entry.shielding)

        // Stats - Damage Taken
        entry.damage_taken = +combatant.damagetaken
        entry.deaths = +combatant.deaths

        // Calculate encounter totals
        entry.encdps = entry.damage / (combat.time.t || 1)
        entry.enchps = entry.healing / (combat.time.t || 1)
        entry.enctps = entry.damage_taken / (combat.time.t || 1)

        return entry
    }

    /**
     * Create or Update a combat entry
     * @param {Object} entry
     */
    _entry (entry) {
        const that = this

        for (const key of this.options.categories) {
            const
                tpl = [this.elements.entry.combat.prefix_mustache, key].join('-'),
                $tpl = $(`#${[this.elements.entry.combat.prefix, key, entry.display_name_short].join('-')}`) || $()

            if (!$tpl.length) {
                if (entry[key] || (key == 'enchps' && entry.shielding)) {
                    // New entry
                    try {
                        $(`.${key}`).append($(Mustache.render($(tpl).html(), $.extend(entry, {
                            format: function () {
                                return (text, render) => {
                                    const [val, digits] = text.split('|')

                                    if (digits) return render(that._format(Utils.getObjValue(this, val), +digits))
                                    return render(that._format(Utils.getObjValue(this, text)))
                                }
                            },
                        }))))
                    } catch (err) {
                        console.error(err)
                    }
                }
            } else {
                // Existing entry
                // Update the entry for sorting
                $tpl.data('sonsho', { sort: entry[key] })

                // Update the job
                if (!$tpl.hasClass(`job-${entry.job}`)) {
                    $tpl.get(0).classList.replace(Array.from($tpl.get(0).classList).find((e) => e.startsWith('job')), `job-${entry.job}`)
                }

                // Update the bar
                $tpl
                    .find(this.elements.entry.combat.graph)
                    .css({ width: `${Utils.getObjValue(entry, `fraction.${key}`)}%` })

                // Update the fields
                $.each($tpl.find(`[class^='entrant']`), (i, field) => {
                    const
                        $field = $(field),
                        sub_key = Utils.getObjValue($field.data(), 'sonsho.key'),
                        sub_val = Utils.getObjValue(entry, sub_key)

                    if (!sub_key) return true

                    // Dynamic Fields
                    if ($field.hasClass(this.elements.entry.combat.dynamic)) {
                        if (sub_val) $field.parent().removeClass('d-none')
                        else $field.parent().addClass('d-none')
                    }

                    // Set the field
                    Utils.setElementValue($field, this._format(sub_val))
                })
            }
        }
    }

    /**
     * Format numbers for visual display
     * @param {Number|String} str 
     * @param {Number} [digits = 1]
     * @return {String}
     */
    _format (str, digits = 1) {
        // Convert the number
        const num = +str

        // Only process if a number
        if (isNaN(num)) return 0
        else if (num == Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY.toString()

        // Format the number
        if (num < 100) return new Intl.NumberFormat([], { maximumFractionDigits: digits }).format(num)
        else if (num < 10000) return new Intl.NumberFormat([], { maximumFractionDigits: 0 }).format(num)
        else if (num >= 1000000) return `${new Intl.NumberFormat([], { maximumFractionDigits: digits }).format(num / 1000000)}M`
        else return `${new Intl.NumberFormat([], { maximumFractionDigits: digits }).format(num / 1000)}k`
    }

    /**
     * Sorts DOM Elements by the stored key
     * @param {JQuery} $entries
     */
    _sort ($entries) {
        $entries.sort((a, b) => {
            const
                val_a = +Utils.getObjValue($(a).data(), 'sonsho.sort'),
                val_b = +Utils.getObjValue($(b).data(), 'sonsho.sort')

            if (val_a > val_b) return -1
            else if (val_a < val_b) return 1
            return 0
        })

        for (let i = 0; i < $entries.length; i++) {
            const
                $entry = $entries.eq(i),
                pos = $entry.index() - i

            // Reposition the entry, if necessary
            $entry.css({ top: `${-pos * this.elements.entry.combat.height}px` })
        }
    }

    /**
     * Handles a CombatData event
     * @param {Object} data 
     */
    async _onCombatData ({ Combatant: combatants, Encounter: encounter, isActive: active }) {
        // Convert all types to Boolean
        active = String(active).toString().toLowerCase() == 'true'

        // TODO: Create history if new encounter
        if (!this.combat.active && active) {
            console.log(`Combat begins: ${encounter.title}`)
            $(this.elements.entry.combat.class).remove()

            // Update the DOM every second
            this.timer = setInterval(() => {
                this.update(JSON.parse(JSON.stringify(this.combat)))
            }, 750)
        }

        // Start new combat
        this.combat = {
            active: active,
            title: encounter.title,
            combatants: Object.values(combatants),
            time: {
                t: +encounter.DURATION,
                formatted: encounter.duration,
            },
            totals: {
                rdps: NaN,
                rhps: NaN,
                rtps: NaN,
            },
            data: encounter,
        }

        if (active == false) {
            console.log(`Combat ends: ${encounter.title}`)
            Utils.setElementValue($([this.elements.header.prefix, 'title'].join('-')), encounter.title)

            clearInterval(this.timer)
            this.timer = null
        }
    }
}

new SonshoDashboard()