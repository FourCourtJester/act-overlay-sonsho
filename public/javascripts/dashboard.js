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
            categories: ['encdps', 'enchps', 'enctps'],
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
            onSendCharName: this._onSendCharName.bind(this),
            onCombatData: this._onCombatData.bind(this),
        }

        // Update the DOM every second
        this.timer = setInterval(() => {
            if (!this.combat.active) return false

            this.update(JSON.parse(JSON.stringify(this.combat)))
            return true
        }, 1000)
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
            // .on('onOverlayStateUpdate', (e) => {
            //     console.log(e.detail)
            // })
            // OverlayPlugin
            // .on('onOverlayDataUpdate', (e) => {
            //     this._onCombatData(e.detail)
            // })
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

        this.socket.subscribe('SendCharName', this.events.onSendCharName)
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
    update (combat) {
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

        const max_values = {
            encdps: 0,
            enchps: 0,
            enctps: 0,
            damage: 0,
            healing: 0,
            damage_taken: 0,
        }

        let entries = []

        // Update the header static values
        Utils.setElementValue($([this.elements.header.prefix, 'time'].join('-')), combat.time.formatted)
        Utils.setElementValue($([this.elements.header.prefix, 'title'].join('-')), combat.title)

        // Create Combatant entries
        for (const combatant of combat.combatants) {
            const entry = { fraction: {} }

            // Identification
            entry.job = combatant.Job.length ? combatant.Job.toUpperCase() : combatant.name.indexOf('(') >= 0 ? '_pet' : '_limit-break'
            entry.display_name = combatant.name
            entry.display_name_short = Utils.slugify(combatant.name)
            entry.you = combatant.name == this.options.YOU,

            // Stats - Damage
            entry.damage = +combatant.damage

            // Stats - Healing
            // entry.shielding = +combatant.damageShield    // ACTWebsocket
            // entry.overhealing = +combatant.overHeal  // ACTWebsocket
            // entry.healing = +combatant.healed - entry.overhealing - entry.shielding  // ACTWebsocket
            // entry.fraction.overhealing = (entry.overhealing / (+combatant.healed || 1)) * 100    // ACTWebsocket

            entry.fraction.overhealing = +(combatant.OverHealPct.slice(0, -1))
            entry.overhealing = +combatant.healed * +(combatant.OverHealPct.slice(0, -1)) / 100
            entry.healing = +combatant.healed - entry.overhealing

            // Stats - Damage Taken
            entry.damage_taken = +combatant.damagetaken
            entry.deaths = +combatant.deaths

            // Calculate encounter totals
            entry.encdps = entry.damage / (combat.time.t || 1)
            entry.enchps = entry.healing / (combat.time.t || 1)
            entry.enctps = entry.damage_taken / (combat.time.t || 1)

            // Find the max value of encounter totals
            for (const stat of Object.keys(max_values)) {
                if (stat.startsWith('enc')) max_values[stat] = Math.max(max_values[stat], entry[stat])
                else max_values[stat] += entry[stat]
            }

            entries.push(entry)
        }

        // Update the header raid values
        Utils.setElementValue($([this.elements.header.prefix, 'rdps'].join('-')), this._format(max_values.damage / (combat.time.t || 1)))
        Utils.setElementValue($([this.elements.header.prefix, 'rhps'].join('-')), this._format(max_values.healing / (combat.time.t || 1)))
        Utils.setElementValue($([this.elements.header.prefix, 'rtps'].join('-')), this._format(max_values.damage_taken / (combat.time.t || 1)))

        // Combatant and Max values are saved
        // Author the entries
        entries = entries.map((e) => {
            // Save the max value into the entry
            for (const stat of Object.keys(max_values)) e.fraction[stat] = (e[stat] / max_values[stat]) * 100
            this._entry(e)
            return e
        })

        // Sort by category
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
    }

    /**
     * Create/Edit a combat entry
     * @param {Object} entry
     */
    _entry (entry) {
        const that = this

        for (const key of this.options.categories) {
            const
                tpl = [this.elements.entry.combat.prefix_mustache, key].join('-'),
                $tpl = $(`#${[this.elements.entry.combat.prefix, key, entry.display_name_short].join('-')}`) || $()

            if (!$tpl.length) {
                if (entry[key]) {
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
                        if (sub_val) $field.removeClass('d-none')
                        else $field.addClass('d-none')
                    }

                    // Set the field
                    Utils.setElementValue($field, this._format(sub_val))
                })
            }
        }
    }

    /**
     * 
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
     * 
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
            $entry.css({ top: `${-pos * 40}px` })
        }
    }

    /**
     * Handles a CharName event
     * @param {Object} data 
     */
    _onSendCharName (data) {
        // Rename your character
        // this.options.YOU = data.charName
    }

    /**
     * Handles a CombatData event
     * @param {Object} data 
     */
    _onCombatData ({ Combatant: combatants, Encounter: encounter, isActive: active }) {
        // Convert all types to Boolean
        active = String(active).toString().toLowerCase() == 'true'

        // TODO: Create history if new encounter
        if (!this.combat.active && active) {
            console.log('Combat begins', encounter.title)
            $(this.elements.entry.combat.class).remove()
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

        // if (this.combat.active) this.update()
        // else console.log('Combat ends', encounter.title)

        if (!active) console.log('Combat ends', encounter.title)
    }
}

new SonshoDashboard()