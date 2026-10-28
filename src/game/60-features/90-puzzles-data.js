/* Puzzles: one entry per line, in play order. A puzzle is data:
   id, pack, n (name), j (one-line joke), cities (all must end up connected), via (optional stepping stones),
   budget (setup + a year of monthly, 0 = no budget star to chase: it is given), and at most a twist or two:
   noSub (no subsea cables), ring (one ring through every POP), lat:[a,b,ms] (best path under ms), minG (every link at
   least this many Gbps), avoid (cities shown on the map that you may not build in). */
const PZ_PACKS=[
 {id:'hello',n:tr('puzzles.hello_world'),d:tr('puzzles.your_first_tubes_no_pressure'),need:0},
 {id:'fire',n:tr('puzzles.ring_of_fire'),d:tr('puzzles.the_pacific_rim_where_every_hop'),need:6},
 {id:'speed',n:tr('puzzles.speed_runs'),d:tr('puzzles.beat_the_clock_light_in_glass'),need:14},
 {id:'n1',n:tr('puzzles.n_1_club'),d:tr('puzzles.for_architects_who_sleep_through_backhoes'),need:22},
];
const PZ=[
 {id:'hello',pack:'hello',n:tr('puzzles.hello_world'),j:tr('puzzles.every_internet_starts_with_one_tube'),cities:['lon','nyc'],budget:0},
 {id:'eurotrip',pack:'hello',n:tr('puzzles.euro_trip'),j:tr('puzzles.three_cities_two_currencies_one_very'),cities:['lon','ams','fra'],budget:0},
 {id:'shining',pack:'hello',n:tr('puzzles.sea_to_shining_sea'),j:tr('puzzles.four_cities_one_continent_and_a'),cities:['nyc','chi','dal','sjc'],budget:300000},
 {id:'smorgas',pack:'hello',n:tr('puzzles.smorgasbord'),j:tr('puzzles.four_capitals_one_very_long_winter'),cities:['osl','sto','cph','hel'],budget:190000},
 {id:'downunder',pack:'hello',n:tr('puzzles.down_under_up_and_running'),j:tr('puzzles.one_very_big_island_and_a'),cities:['syd','mel','bne','adl'],budget:300000},
 {id:'aloha',pack:'fire',n:tr('puzzles.aloha_latency'),j:tr('puzzles.honolulu_the_world_s_most_scenic'),cities:['sjc','hnl','syd'],budget:1750000},
 {id:'rimshot',pack:'fire',n:tr('puzzles.pacific_rim_shot'),j:tr('puzzles.seattle_to_singapore_with_a_stop'),cities:['sea','tok','hkg','sin'],budget:1200000},
 {id:'fire',pack:'fire',n:tr('puzzles.ring_of_fire'),j:tr('puzzles.four_cities_four_cables_one_ring'),cities:['tok','hkg','sin','syd'],ring:true,budget:1600000},
 {id:'kiwi',pack:'fire',n:tr('puzzles.kiwi_fruit_salad'),j:tr('puzzles.new_zealand_is_far_from_everything'),cities:['akl','syd','sea'],via:['hnl','suv','lax'],budget:1400000},
 {id:'guam',pack:'fire',n:tr('puzzles.guam_slam'),j:tr('puzzles.a_tiny_island_where_half_the'),cities:['tok','mnl','syd'],via:['gum'],budget:1600000},
 {id:'flash',pack:'speed',n:tr('puzzles.flash_boys'),j:tr('puzzles.traders_paid_millions_to_shave_milliseconds'),cities:['nyc','lon'],lat:['nyc','lon',27],budget:450000},
 {id:'pingpong',pack:'speed',n:tr('puzzles.ping_pong_to_tokyo'),j:tr('puzzles.the_pacific_is_big_light_is'),cities:['lax','tok'],via:['sea','sjc'],lat:['lax','tok',47],budget:850000},
 {id:'suez',pack:'speed',n:tr('puzzles.suez_you_later'),j:tr('puzzles.frankfurt_to_singapore_the_short_way'),cities:['fra','sin'],via:['mrs','bom'],lat:['fra','sin',68],budget:1000000},
 {id:'samba',pack:'speed',n:tr('puzzles.samba_sprint'),j:tr('puzzles.sao_paulo_to_miami_before_the'),cities:['sao','mia'],via:['for','rio'],lat:['sao','mia',45],budget:1060000},
 {id:'sharks',pack:'n1',n:tr('puzzles.the_shark_tank'),j:tr('puzzles.the_sharks_have_been_biting_again'),cities:['lis','mad','par','mil'],via:['bcn','mrs'],noSub:true,budget:210000},
 {id:'braces',pack:'n1',n:tr('puzzles.belt_and_braces'),j:tr('puzzles.two_cables_across_the_atlantic_because'),cities:['nyc','lon','dub'],budget:380000},
 {id:'nofra',pack:'n1',n:tr('puzzles.not_through_frankfurt'),j:tr('puzzles.de_kicks_sales_has_your_number'),cities:['ams','ber','muc','zrh'],via:['ham','dus'],avoid:['fra'],budget:200000},
 {id:'fatpipes',pack:'n1',n:tr('puzzles.fat_pipes_only'),j:tr('puzzles.nobody_ever_got_fired_for_buying'),cities:['par','mrs','mil','zrh'],minG:100,budget:240000},
];
// Weekly puzzle pools: each is one landmass and one region, so every pair has an overland route.
const PZ_WEEK_POOLS=[
 ['fra','ams','par','mad','mil','ber','waw','vie','sto','cph','prg','zrh','bcn','mrs','muc','bud'],
 ['nyc','chi','dal','sea','sjc','lax','mia','ash','atn','den','bos','hou','phx','tor','mtl'],
 ['sao','rio','bsb','bhz','cwb','poa','ssa','rec','for','cpq'],
 ['syd','mel','bne','adl','cbr','per'],
 ['bom','del','maa','blr','hyd'],
];
